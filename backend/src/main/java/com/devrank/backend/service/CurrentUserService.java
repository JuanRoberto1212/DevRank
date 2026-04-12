package com.devrank.backend.service;

import com.devrank.backend.model.User;
import com.devrank.backend.repository.UserRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

  private final UserRepository userRepository;

  public User getByEmail(String email) {
    String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
    return userRepository
        .findByEmail(normalizedEmail)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado."));
  }
}
