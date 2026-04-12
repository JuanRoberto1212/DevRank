package com.devrank.backend.dto.income;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record IncomeRequest(
    @NotNull @DecimalMin(value = "0.01") @Digits(integer = 12, fraction = 2) BigDecimal valor,
    @NotBlank @Size(max = 30) String tipo,
    @NotBlank @Size(max = 80) String area,
    @NotBlank @Size(max = 40) String nivel,
    @NotBlank @Size(max = 80) String regiao,
    @NotNull LocalDate data) {}
