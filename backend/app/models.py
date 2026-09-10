from datetime import datetime
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["STUDENT", "INSTITUTION_ADMIN", "PLATFORM_ADMIN"]

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str
    role: UserRole = "STUDENT"
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    college: Optional[str] = None
    year: Optional[str] = None
    onboarding_completed: bool = False
    current_streak: int = 0
    longest_streak: int = 0
    streak: int = 0
    last_active_date: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=1)
    role: Optional[UserRole] = "STUDENT"
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None

class InstitutionOptionResponse(BaseModel):
    id: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class OnboardingRequest(BaseModel):
    goal: str
    target_role: Optional[str] = None
    current_role: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    experience: Optional[str] = None
    learning_style: Optional[str] = ""
    available_time: Optional[str] = ""
    preferred_content: List[str] = Field(default_factory=list)
    language: Optional[str] = "English"
    known_topics: Optional[List[str]] = Field(default_factory=list)
    institution_id: Optional[str] = None
    college_name: Optional[str] = None

class IdentityResponse(BaseModel):
    goal: Optional[str] = None
    year: Optional[str] = None
    college: Optional[str] = None
    target_role: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    completed: bool = True

class TopicCheckSubmissionRequest(BaseModel):
    answers: Dict[str, int]

class RefreshRequest(BaseModel):
    topic: Optional[str] = None

# Phase 3: Institution & Assessments Models
class InstitutionAnalyticsResponse(BaseModel):
    total_students: int
    assessment_count: int
    contest_count: int
    total_submissions: int

class QuestionManual(BaseModel):
    id: Optional[str] = None
    prompt: str
    options: List[str]
    correct_option: int = 0
    skill: Optional[str] = None

class AssessmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = ""
    skill: str = Field(..., min_length=1)
    # Mode A (manual)
    questions: Optional[List[QuestionManual]] = None
    # Mode B (quiz_bank sampled)
    year: Optional[str] = None
    topic_code: Optional[str] = None
    question_count: Optional[int] = None
    # Time & duration limits
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None

class AssessmentSubmissionRequest(BaseModel):
    answers: Dict[str, int]

# Coding Contest Models
class ContestCreateRequest(BaseModel):
    question_count: int = Field(default=2, ge=1)
    start_time: str = Field(..., min_length=1)
    end_time: str = Field(..., min_length=1)
    duration_minutes: Optional[int] = None

class CodeSubmitRequest(BaseModel):
    question_id: str = Field(..., min_length=1)
    code: str
    language: Optional[str] = "python"

class TestCaseResult(BaseModel):
    test_case_index: int
    passed: bool

class CodeSubmitResponse(BaseModel):
    passed: Optional[bool]
    results: List[TestCaseResult]
    error: Optional[str] = None


