"""
AURA-X Level 5 Orchestration Agent
Simplified autonomous music production workflow automation
"""

import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import requests
import json
import uvicorn

# Initialize FastAPI app
app = FastAPI(title="AURA-X Orchestration Agent")

# Environment variables
MODAL_BASE_URL = os.getenv("MODAL_BASE_URL", "https://your-modal-app.modal.run")
MODAL_API_KEY = os.getenv("MODAL_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
QUALITY_SCORING_URL = os.getenv("QUALITY_SCORING_URL", "http://localhost:8001")

# Initialize LangChain LLM
llm = ChatOpenAI(
    model="gpt-4",
    temperature=0.7,
    openai_api_key=OPENAI_API_KEY
)

# Request/Response models
class WorkflowRequest(BaseModel):
    goal: str
    user_id: str
    parameters: Optional[Dict[str, Any]] = {}

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    steps: List[Dict[str, str]]
    result: Dict[str, Any]

class WorkflowStep(BaseModel):
    workflow_id: str
    step_name: str
    parameters: Optional[Dict[str, Any]] = {}

# Tool implementations
def generate_music(prompt: str, **params) -> Dict[str, Any]:
    """Generate music using Modal AI endpoint"""
    try:
        response = requests.post(
            f"{MODAL_BASE_URL}/generate-music",
            json={"prompt": prompt, **params},
            headers={"Authorization": f"Bearer {MODAL_API_KEY}"},
            timeout=120
        )
        return response.json()
    except Exception as e:
        return {"error": str(e), "status": "failed"}

def check_quality(audio_url: str) -> Dict[str, Any]:
    """Check audio quality using quality scoring service"""
    try:
        response = requests.post(
            f"{QUALITY_SCORING_URL}/analyze",
            json={"audio_url": audio_url},
            timeout=60
        )
        return response.json()
    except Exception as e:
        return {"error": str(e), "status": "failed"}

def separate_stems(audio_url: str) -> Dict[str, Any]:
    """Separate audio into stems using Modal endpoint"""
    try:
        response = requests.post(
            f"{MODAL_BASE_URL}/separate-stems",
            json={"audio_url": audio_url},
            headers={"Authorization": f"Bearer {MODAL_API_KEY}"},
            timeout=180
        )
        return response.json()
    except Exception as e:
        return {"error": str(e), "status": "failed"}

def apply_mastering(audio_url: str, target_lufs: float = -14.0) -> Dict[str, Any]:
    """Apply mastering to audio using Modal endpoint"""
    try:
        response = requests.post(
            f"{MODAL_BASE_URL}/master-audio",
            json={"audio_url": audio_url, "target_loudness": target_lufs},
            headers={"Authorization": f"Bearer {MODAL_API_KEY}"},
            timeout=120
        )
        return response.json()
    except Exception as e:
        return {"error": str(e), "status": "failed"}

def export_track(audio_url: str, format: str = "wav") -> Dict[str, Any]:
    """Export track to specified format"""
    return {
        "status": "completed",
        "download_url": audio_url,
        "format": format
    }

# Autonomous workflow executor
async def execute_autonomous_workflow(goal: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute autonomous music production workflow using LLM to orchestrate tools
    """
    workflow_steps = []
    
    # Step 1: Parse goal and create execution plan
    system_prompt = """You are an expert Amapiano music producer AI. Given a user goal, create a step-by-step execution plan.
    
Available tools:
- generate_music: Generate music from text prompt
- check_quality: Analyze audio quality (LUFS, spectral balance, cultural authenticity)
- separate_stems: Separate audio into stems (vocals, drums, bass, other)
- apply_mastering: Master audio to target LUFS level
- export_track: Export final track

Respond with a JSON array of steps in this format:
[
  {"tool": "generate_music", "params": {"prompt": "...", "tempo": 112, "duration": 120}},
  {"tool": "check_quality", "params": {"audio_url": "$GENERATED_AUDIO_URL"}},
  {"tool": "apply_mastering", "params": {"audio_url": "$GENERATED_AUDIO_URL", "target_lufs": -14}},
  {"tool": "export_track", "params": {"audio_url": "$MASTERED_AUDIO_URL", "format": "wav"}}
]"""
    
    try:
        # Get execution plan from LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Goal: {goal}\nParameters: {json.dumps(params)}")
        ]
        
        response = llm.invoke(messages)
        plan_text = response.content
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\[.*\]', plan_text, re.DOTALL)
        if json_match:
            execution_plan = json.loads(json_match.group())
        else:
            # Fallback to default workflow
            execution_plan = [
                {"tool": "generate_music", "params": {"prompt": goal, **params}},
                {"tool": "check_quality", "params": {}},
                {"tool": "apply_mastering", "params": {"target_lufs": -14}},
                {"tool": "export_track", "params": {"format": "wav"}}
            ]
        
        # Execute each step
        context = {}  # Store results from previous steps
        
        for step in execution_plan:
            tool_name = step["tool"]
            tool_params = step["params"]
            
            # Resolve variable references (e.g., $GENERATED_AUDIO_URL)
            for key, value in tool_params.items():
                if isinstance(value, str) and value.startswith("$"):
                    var_name = value[1:]
                    tool_params[key] = context.get(var_name)
            
            # Execute tool
            if tool_name == "generate_music":
                result = generate_music(**tool_params)
                context["GENERATED_AUDIO_URL"] = result.get("audioUrl")
                workflow_steps.append({"step": "generate_music", "status": "completed", "result": result})
                
            elif tool_name == "check_quality":
                audio_url = tool_params.get("audio_url") or context.get("GENERATED_AUDIO_URL")
                result = check_quality(audio_url)
                workflow_steps.append({"step": "check_quality", "status": "completed", "result": result})
                
            elif tool_name == "separate_stems":
                audio_url = tool_params.get("audio_url") or context.get("GENERATED_AUDIO_URL")
                result = separate_stems(audio_url)
                context["STEMS"] = result.get("stems")
                workflow_steps.append({"step": "separate_stems", "status": "completed", "result": result})
                
            elif tool_name == "apply_mastering":
                audio_url = tool_params.get("audio_url") or context.get("GENERATED_AUDIO_URL")
                target_lufs = tool_params.get("target_lufs", -14)
                result = apply_mastering(audio_url, target_lufs)
                context["MASTERED_AUDIO_URL"] = result.get("audioUrl")
                workflow_steps.append({"step": "apply_mastering", "status": "completed", "result": result})
                
            elif tool_name == "export_track":
                audio_url = tool_params.get("audio_url") or context.get("MASTERED_AUDIO_URL") or context.get("GENERATED_AUDIO_URL")
                format = tool_params.get("format", "wav")
                result = export_track(audio_url, format)
                workflow_steps.append({"step": "export_track", "status": "completed", "result": result})
        
        return {
            "status": "completed",
            "steps": workflow_steps,
            "final_result": context
        }
        
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e),
            "steps": workflow_steps
        }

# API endpoints
@app.post("/workflow", response_model=WorkflowResponse)
async def execute_workflow(request: WorkflowRequest):
    """
    Execute an autonomous music production workflow
    """
    try:
        result = await execute_autonomous_workflow(request.goal, request.parameters)
        
        import time
        workflow_id = f"wf-{request.user_id}-{int(time.time())}"
        
        return WorkflowResponse(
            workflow_id=workflow_id,
            status=result["status"],
            steps=result.get("steps", []),
            result=result.get("final_result", {})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "modal_configured": bool(MODAL_API_KEY and not MODAL_BASE_URL.startswith("https://your-modal")),
        "openai_configured": bool(OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-placeholder"))
    }

if __name__ == "__main__":
    print("🎵 AURA-X Level 5 Orchestration Agent starting...")
    print(f"📡 Modal Base URL: {MODAL_BASE_URL}")
    print(f"🔑 Modal API Key: {'✓ Configured' if MODAL_API_KEY else '✗ Not configured'}")
    print(f"🤖 OpenAI API Key: {'✓ Configured' if OPENAI_API_KEY and not OPENAI_API_KEY.startswith('sk-placeholder') else '✗ Not configured'}")
    print(f"📊 Quality Scoring URL: {QUALITY_SCORING_URL}")
    print("🚀 Starting server on port 8000...")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
