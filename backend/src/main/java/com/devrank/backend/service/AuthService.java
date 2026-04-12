package com.devrank.backend.service;

import com.devrank.backend.dto.auth.AuthLoginRequest;
import com.devrank.backend.dto.auth.AuthRegisterRequest;
import com.devrank.backend.dto.auth.AuthResponse;
import com.devrank.backend.model.User;
import com.devrank.backend.repository.UserRepository;
import com.devrank.backend.security.JwtService;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final AuthenticationManager authenticationManager;

  public AuthResponse register(AuthRegisterRequest request) {
    String email = normalizeEmail(request.email());
    if (userRepository.existsByEmail(email)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail ja cadastrado.");
    }

    User user = User.builder().email(email).password(passwordEncoder.encode(request.password())).build();
    User savedUser = userRepository.save(user);

    String token = jwtService.generateToken(savedUser.getId(), savedUser.getEmail());
    return new AuthResponse(token, savedUser.getId(), savedUser.getEmail());
  }

  public AuthResponse login(AuthLoginRequest request) {
    String email = normalizeEmail(request.email());
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(email, request.password()));
    } catch (AuthenticationException ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais invalidas.");
    }

    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais invalidas."));

    String token = jwtService.generateToken(user.getId(), user.getEmail());
    return new AuthResponse(token, user.getId(), user.getEmail());
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }
}