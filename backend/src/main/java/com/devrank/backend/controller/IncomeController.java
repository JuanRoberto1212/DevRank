package com.devrank.backend.controller;

import com.devrank.backend.dto.income.IncomeRequest;
import com.devrank.backend.dto.income.IncomeResponse;
import com.devrank.backend.service.IncomeService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/income")
@RequiredArgsConstructor
public class IncomeController {

  private final IncomeService incomeService;

  @GetMapping
  public List<IncomeResponse> list(Principal principal) {
    return incomeService.listByAuthenticatedUser(principal.getName());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public IncomeResponse create(@Valid @RequestBody IncomeRequest request, Principal principal) {
    return incomeService.create(principal.getName(), request);
  }

  @PutMapping("/{id}")
  public IncomeResponse update(
      @PathVariable UUID id, @Valid @RequestBody IncomeRequest request, Principal principal) {
    return incomeService.update(principal.getName(), id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id, Principal principal) {
    incomeService.delete(principal.getName(), id);
  }
}
