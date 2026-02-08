"""
S3 Upload Helper for Modal Orchestration
"""

import boto3
import os
from typing import Optional

def upload_to_s3(audio_data: bytes, generation_id: str) -> str:
    """
    Upload audio file to S3 and return public URL
    
    Args:
        audio_data: Raw audio file bytes
        generation_id: Unique generation identifier
        
    Returns:
        Public S3 URL for the uploaded file
    """
    # Get S3 credentials from environment
    s3_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    s3_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    s3_bucket = os.environ.get("S3_BUCKET")
    s3_region = os.environ.get("S3_REGION", "us-east-1")
    
    if not all([s3_access_key, s3_secret_key, s3_bucket]):
        raise ValueError("Missing S3 credentials in environment variables")
    
    # Create S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=s3_access_key,
        aws_secret_access_key=s3_secret_key,
        region_name=s3_region
    )
    
    # Generate S3 key with random suffix to prevent enumeration
    import random
    import string
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    s3_key = f"generated-audio/{generation_id}-{random_suffix}.wav"
    
    # Upload to S3
    s3_client.put_object(
        Bucket=s3_bucket,
        Key=s3_key,
        Body=audio_data,
        ContentType='audio/wav',
        ACL='public-read'  # Make file publicly accessible
    )
    
    # Construct public URL
    s3_url = f"https://{s3_bucket}.s3.{s3_region}.amazonaws.com/{s3_key}"
    
    return s3_url
