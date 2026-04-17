package com.devrank.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRegisterRequest(
    @NotBlank @Size(min = 3, max = 50) String username,
    @NotBlank String area,
    @NotBlank String nivel,
    @NotBlank @Email String email, @NotBlank @Size(min = 6, max = 120) String password) {}
