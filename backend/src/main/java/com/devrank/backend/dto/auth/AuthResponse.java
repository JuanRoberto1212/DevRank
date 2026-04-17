package com.devrank.backend.dto.auth;

import java.util.UUID;

public record AuthResponse(
    String token, UUID userId, String email, String username, String cargo, String area, String nivel) {}
