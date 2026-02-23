from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    first_name: str | None = Field(None, alias="firstName")
    last_name: str | None = Field(None, alias="lastName")
    role: str | None = "CANDIDATE"


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class TokenResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")
    user: "UserResponse"


class RefreshBody(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    email: str
    first_name: str | None = Field(None, alias="firstName", serialization_alias="firstName")
    last_name: str | None = Field(None, alias="lastName", serialization_alias="lastName")
    role: str


TokenResponse.model_rebuild()
