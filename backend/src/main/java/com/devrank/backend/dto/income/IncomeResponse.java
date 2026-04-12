package com.devrank.backend.dto.income;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record IncomeResponse(
    UUID id,
    BigDecimal valor,
    String tipo,
    String area,
    String nivel,
    String regiao,
    LocalDate data) {}
