package com.devrank.backend.service;

import com.devrank.backend.dto.income.IncomeRequest;
import com.devrank.backend.dto.income.IncomeResponse;
import com.devrank.backend.model.Income;
import com.devrank.backend.model.User;
import com.devrank.backend.repository.IncomeRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class IncomeService {

  private final IncomeRepository incomeRepository;
  private final CurrentUserService currentUserService;

  public List<IncomeResponse> listByAuthenticatedUser(String authenticatedEmail) {
    User user = currentUserService.getByEmail(authenticatedEmail);
    return incomeRepository.findByUser_IdOrderByDataDescIdDesc(user.getId()).stream()
        .map(this::toResponse)
        .toList();
  }

  public IncomeResponse create(String authenticatedEmail, IncomeRequest request) {
    User user = currentUserService.getByEmail(authenticatedEmail);
    Income income = buildIncomeEntity(user, request);
    return toResponse(incomeRepository.save(income));
  }

  public IncomeResponse update(String authenticatedEmail, UUID incomeId, IncomeRequest request) {
    User user = currentUserService.getByEmail(authenticatedEmail);
    Income income =
        incomeRepository
            .findByIdAndUser_Id(incomeId, user.getId())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ganho nao encontrado."));

    applyRequestData(income, request);
    return toResponse(incomeRepository.save(income));
  }

  public void delete(String authenticatedEmail, UUID incomeId) {
    User user = currentUserService.getByEmail(authenticatedEmail);
    Income income =
        incomeRepository
            .findByIdAndUser_Id(incomeId, user.getId())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ganho nao encontrado."));
    incomeRepository.delete(income);
  }

  private Income buildIncomeEntity(User user, IncomeRequest request) {
    Income income = new Income();
    income.setUser(user);
    applyRequestData(income, request);
    return income;
  }

  private void applyRequestData(Income income, IncomeRequest request) {
    income.setValor(scaleMoney(request.valor()));
    income.setTipo(normalizeUpper(request.tipo()));
    income.setArea(normalizeLower(request.area()));
    income.setNivel(normalizeLower(request.nivel()));
    income.setRegiao(normalizeLower(request.regiao()));
    income.setData(request.data());
  }

  private IncomeResponse toResponse(Income income) {
    return new IncomeResponse(
        income.getId(),
        scaleMoney(income.getValor()),
        income.getTipo(),
        income.getArea(),
        income.getNivel(),
        income.getRegiao(),
        income.getData());
  }

  private BigDecimal scaleMoney(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private String normalizeUpper(String value) {
    return value.trim().toUpperCase(Locale.ROOT);
  }

  private String normalizeLower(String value) {
    return value.trim().toLowerCase(Locale.ROOT);
  }
}
