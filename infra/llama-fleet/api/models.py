"""
Pydantic models for OpenAI-compatible API schema.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: system, user, assistant")
    content: str = Field(..., description="Message content")
    name: Optional[str] = None


class ResponseFormat(BaseModel):
    type: str = "text"  # "text" or "json_object"


class ChatCompletionRequest(BaseModel):
    model: str = Field(..., description="Model ID")
    messages: list[ChatMessage] = Field(..., description="Chat messages")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    n: Optional[int] = Field(1, ge=1, le=8)
    max_tokens: Optional[int] = Field(4096, ge=1, le=32768)
    stop: Optional[list[str]] = None
    stream: Optional[bool] = False
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    response_format: Optional[ResponseFormat] = None
    user: Optional[str] = None


class CompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str


class UsageInfo(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[CompletionChoice]
    usage: UsageInfo


class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str
    permission: list[Any] = []
    root: str
    parent: Optional[str] = None


class ModelListResponse(BaseModel):
    object: str = "list"
    data: list[ModelInfo]


class ErrorResponse(BaseModel):
    error: dict
