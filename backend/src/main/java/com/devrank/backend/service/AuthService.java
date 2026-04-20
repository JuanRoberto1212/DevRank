package com.devrank.backend.service;

import com.devrank.backend.domain.DomainCatalog;
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
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final AuthenticationManager authenticationManager;

  @Transactional
  public AuthResponse register(AuthRegisterRequest request) {
    String email = normalizeEmail(request.email());
    String username = normalizeUsername(request.username());
    String area = normalizeLower(request.area());
    String nivel = normalizeLower(request.nivel());

    if (!DomainCatalog.isValidArea(area)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Area invalida. Opcoes: " + String.join(", ", DomainCatalog.AREAS));
    }

    if (!DomainCatalog.isValidNivel(nivel)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Nivel invalido. Opcoes: " + String.join(", ", DomainCatalog.NIVEIS));
    }

    User userByEmail = userRepository.findByEmail(email).orElse(null);

    validateUsernameAvailability(username, userByEmail);

    if (userByEmail != null) {
      if (!passwordEncoder.matches(request.password(), userByEmail.getPassword())) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "E-mail ja cadastrado. Use a mesma senha atual para regravar os dados de cadastro.");
      }

      userByEmail.setUsername(username);
      userByEmail.setArea(area);
      userByEmail.setNivel(nivel);
      userByEmail.setCargo(buildCargo(area, nivel));

      User updatedUser = userRepository.save(userByEmail);
      String token = jwtService.generateToken(updatedUser.getId(), updatedUser.getEmail());
      return toAuthResponse(token, updatedUser);
    }

    User newUser =
        User.builder()
            .email(email)
            .username(username)
            .area(area)
            .nivel(nivel)
            .cargo(buildCargo(area, nivel))
            .password(passwordEncoder.encode(request.password()))
            .build();
    User savedUser = userRepository.save(newUser);

    String token = jwtService.generateToken(savedUser.getId(), savedUser.getEmail());
    return toAuthResponse(token, savedUser);
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
    return toAuthResponse(token, user);
  }

  private AuthResponse toAuthResponse(String token, User user) {
    return new AuthResponse(
        token,
        user.getId(),
        user.getEmail(),
        user.getUsername(),
        user.getCargo(),
        user.getArea(),
        user.getNivel());
  }

  private String buildCargo(String area, String nivel) {
    return toTitleCase(area) + " " + toTitleCase(nivel);
  }

  private String toTitleCase(String value) {
    if (value == null || value.isBlank()) {
      return "";
    }
    return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1).toLowerCase(Locale.ROOT);
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeUsername(String username) {
    return username.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeLower(String value) {
    return value.trim().toLowerCase(Locale.ROOT);
  }

  private void validateUsernameAvailability(String username, User userByEmail) {
    userRepository
        .findByUsername(username)
        .filter(foundUser -> userByEmail == null || !foundUser.getId().equals(userByEmail.getId()))
        .ifPresent(
            ignored -> {
              throw new ResponseStatusException(HttpStatus.CONFLICT, "Nome de usuario ja cadastrado.");
            });
  }
}
