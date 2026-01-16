"""
Temporal Workflows for AURA-X AI Music Generation
Level 5 Autonomous Agent Architecture

This module defines Temporal workflows for managing long-running AI music generation
and stem separation tasks with automatic retries, progress tracking, and error handling.
"""

from datetime import timedelta
from temporalio import workflow, activity
from temporalio.common import RetryPolicy
import asyncio
import httpx
from typing import Dict, Any, Optional

# =============================================================================
# Activities (actual work that can fail and be retried)
# =============================================================================

@activity.defn
async def call_modal_music_generation(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Activity: Call Modal MusicGen API to generate music
    
    This activity is retryable and can be compensated if needed.
    """
    modal_base_url = params.get('modal_base_url')
    modal_api_key = params.get('modal_api_key')
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(
            f"{modal_base_url}/generate-music",
            json={
                'prompt': params['prompt'],
                'lyrics': params.get('lyrics'),
                'duration': params.get('duration', 30),
                'temperature': params.get('temperature', 1.0),
            },
            headers={'Authorization': f'Bearer {modal_api_key}'}
        )
        response.raise_for_status()
        return response.json()


@activity.defn
async def call_modal_stem_separation(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Activity: Call Modal Demucs API to separate stems
    
    This activity is retryable and can be compensated if needed.
    """
    modal_base_url = params.get('modal_base_url')
    modal_api_key = params.get('modal_api_key')
    
    async with httpx.AsyncClient(timeout=600.0) as client:
        response = await client.post(
            f"{modal_base_url}/separate-stems",
            json={
                'audio_url': params['audio_url'],
                'model': params.get('model', 'htdemucs'),
            },
            headers={'Authorization': f'Bearer {modal_api_key}'}
        )
        response.raise_for_status()
        return response.json()


@activity.defn
async def update_generation_status(params: Dict[str, Any]) -> None:
    """
    Activity: Update generation status in database via tRPC
    
    This ensures the frontend can track progress.
    """
    # In production, this would call your tRPC backend
    # For now, we'll simulate the update
    generation_id = params['generation_id']
    status = params['status']
    result_url = params.get('result_url')
    
    # TODO: Call tRPC backend to update database
    workflow.logger.info(f"Updated generation {generation_id} to status {status}")


@activity.defn
async def send_completion_notification(params: Dict[str, Any]) -> None:
    """
    Activity: Send notification to user when generation completes
    
    Uses the built-in notification API.
    """
    user_id = params['user_id']
    title = params['title']
    content = params['content']
    
    # TODO: Call notification API
    workflow.logger.info(f"Sent notification to user {user_id}: {title}")


# =============================================================================
# Workflows (orchestration logic)
# =============================================================================

@workflow.defn
class MusicGenerationWorkflow:
    """
    Workflow: Orchestrate complete music generation process
    
    This workflow:
    1. Calls Modal MusicGen API
    2. Polls for completion
    3. Updates database status
    4. Sends notification to user
    5. Handles retries and errors automatically
    """
    
    @workflow.run
    async def run(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute music generation workflow
        
        Args:
            params: {
                'generation_id': int,
                'user_id': int,
                'prompt': str,
                'lyrics': Optional[str],
                'duration': int,
                'modal_base_url': str,
                'modal_api_key': str,
            }
        
        Returns:
            {
                'job_id': str,
                'audio_url': str,
                'status': 'completed' | 'failed',
            }
        """
        generation_id = params['generation_id']
        user_id = params['user_id']
        
        # Configure retry policy: exponential backoff with max 5 retries
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=60),
            backoff_coefficient=2.0,
            maximum_attempts=5,
        )
        
        try:
            # Step 1: Update status to 'processing'
            await workflow.execute_activity(
                update_generation_status,
                {
                    'generation_id': generation_id,
                    'status': 'processing',
                },
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy,
            )
            
            # Step 2: Call Modal MusicGen API
            workflow.logger.info(f"Starting music generation for {generation_id}")
            result = await workflow.execute_activity(
                call_modal_music_generation,
                params,
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=retry_policy,
            )
            
            job_id = result['job_id']
            
            # Step 3: Poll for completion (with timeout)
            max_polls = 60  # 5 minutes max (5s * 60)
            for i in range(max_polls):
                await asyncio.sleep(5)  # Poll every 5 seconds
                
                # Check job status via Modal API
                # In production, this would be another activity
                workflow.logger.info(f"Polling job {job_id}, attempt {i+1}/{max_polls}")
                
                # Simulate completion check (replace with real Modal API call)
                if i >= 10:  # Simulate completion after ~50 seconds
                    audio_url = result.get('audio_url', f"https://s3.example.com/{job_id}.mp3")
                    
                    # Step 4: Update status to 'completed'
                    await workflow.execute_activity(
                        update_generation_status,
                        {
                            'generation_id': generation_id,
                            'status': 'completed',
                            'result_url': audio_url,
                        },
                        start_to_close_timeout=timedelta(seconds=30),
                        retry_policy=retry_policy,
                    )
                    
                    # Step 5: Send completion notification
                    await workflow.execute_activity(
                        send_completion_notification,
                        {
                            'user_id': user_id,
                            'title': 'Music Generation Complete',
                            'content': f'Your track is ready! Listen now.',
                        },
                        start_to_close_timeout=timedelta(seconds=30),
                        retry_policy=retry_policy,
                    )
                    
                    return {
                        'job_id': job_id,
                        'audio_url': audio_url,
                        'status': 'completed',
                    }
            
            # Timeout: generation took too long
            raise Exception(f"Music generation timed out after {max_polls * 5} seconds")
            
        except Exception as e:
            workflow.logger.error(f"Music generation failed: {str(e)}")
            
            # Update status to 'failed'
            await workflow.execute_activity(
                update_generation_status,
                {
                    'generation_id': generation_id,
                    'status': 'failed',
                },
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy,
            )
            
            # Send failure notification
            await workflow.execute_activity(
                send_completion_notification,
                {
                    'user_id': user_id,
                    'title': 'Music Generation Failed',
                    'content': f'Sorry, generation failed: {str(e)}',
                },
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy,
            )
            
            return {
                'job_id': None,
                'audio_url': None,
                'status': 'failed',
                'error': str(e),
            }


@workflow.defn
class StemSeparationWorkflow:
    """
    Workflow: Orchestrate stem separation process
    
    This workflow:
    1. Calls Modal Demucs API
    2. Polls for completion
    3. Updates database with stem URLs
    4. Sends notification to user
    5. Handles retries and errors automatically
    """
    
    @workflow.run
    async def run(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute stem separation workflow
        
        Args:
            params: {
                'generation_id': int,
                'user_id': int,
                'audio_url': str,
                'modal_base_url': str,
                'modal_api_key': str,
            }
        
        Returns:
            {
                'job_id': str,
                'stems_url': Dict[str, str],  # {drums, bass, vocals, other}
                'status': 'completed' | 'failed',
            }
        """
        generation_id = params['generation_id']
        user_id = params['user_id']
        
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=60),
            backoff_coefficient=2.0,
            maximum_attempts=5,
        )
        
        try:
            # Step 1: Call Modal Demucs API
            workflow.logger.info(f"Starting stem separation for {generation_id}")
            result = await workflow.execute_activity(
                call_modal_stem_separation,
                params,
                start_to_close_timeout=timedelta(minutes=15),
                retry_policy=retry_policy,
            )
            
            job_id = result['job_id']
            
            # Step 2: Poll for completion
            max_polls = 120  # 10 minutes max (5s * 120)
            for i in range(max_polls):
                await asyncio.sleep(5)
                
                workflow.logger.info(f"Polling stem separation {job_id}, attempt {i+1}/{max_polls}")
                
                # Simulate completion (replace with real Modal API call)
                if i >= 20:  # Simulate completion after ~100 seconds
                    stems_url = result.get('stems_url', {
                        'drums': f"https://s3.example.com/{job_id}/drums.mp3",
                        'bass': f"https://s3.example.com/{job_id}/bass.mp3",
                        'vocals': f"https://s3.example.com/{job_id}/vocals.mp3",
                        'other': f"https://s3.example.com/{job_id}/other.mp3",
                    })
                    
                    # Step 3: Update database with stem URLs
                    await workflow.execute_activity(
                        update_generation_status,
                        {
                            'generation_id': generation_id,
                            'status': 'completed',
                            'result_url': stems_url,
                        },
                        start_to_close_timeout=timedelta(seconds=30),
                        retry_policy=retry_policy,
                    )
                    
                    # Step 4: Send completion notification
                    await workflow.execute_activity(
                        send_completion_notification,
                        {
                            'user_id': user_id,
                            'title': 'Stem Separation Complete',
                            'content': f'Your stems are ready! Import to DAW now.',
                        },
                        start_to_close_timeout=timedelta(seconds=30),
                        retry_policy=retry_policy,
                    )
                    
                    return {
                        'job_id': job_id,
                        'stems_url': stems_url,
                        'status': 'completed',
                    }
            
            raise Exception(f"Stem separation timed out after {max_polls * 5} seconds")
            
        except Exception as e:
            workflow.logger.error(f"Stem separation failed: {str(e)}")
            
            await workflow.execute_activity(
                update_generation_status,
                {
                    'generation_id': generation_id,
                    'status': 'failed',
                },
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy,
            )
            
            return {
                'job_id': None,
                'stems_url': None,
                'status': 'failed',
                'error': str(e),
            }


# =============================================================================
# Worker Configuration
# =============================================================================

async def run_worker():
    """
    Run Temporal worker to process workflows and activities
    
    This should be run as a separate process:
    python -m temporal_workflows
    """
    from temporalio.client import Client
    from temporalio.worker import Worker
    
    # Connect to Temporal server
    client = await Client.connect("localhost:7233")
    
    # Create worker
    worker = Worker(
        client,
        task_queue="aura-x-music-generation",
        workflows=[MusicGenerationWorkflow, StemSeparationWorkflow],
        activities=[
            call_modal_music_generation,
            call_modal_stem_separation,
            update_generation_status,
            send_completion_notification,
        ],
    )
    
    # Run worker
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_worker())
