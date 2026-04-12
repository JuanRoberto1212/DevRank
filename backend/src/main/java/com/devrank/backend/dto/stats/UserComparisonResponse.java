package com.devrank.backend.dto.stats;

import java.math.BigDecimal;

public record UserComparisonResponse(
    String area,
    BigDecimal mediaUsuario,
    BigDecimal mediaMercado,
    BigDecimal diferencaPercentual,
    String situacao) {}
