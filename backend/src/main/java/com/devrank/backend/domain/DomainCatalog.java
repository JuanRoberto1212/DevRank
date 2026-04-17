package com.devrank.backend.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class DomainCatalog {

  public static final String FIXED_INCOME_TYPE = "FIXA";
  public static final String VARIABLE_INCOME_TYPE = "VARIAVEL";

  public static final List<String> AREAS = List.of("frontend", "backend", "data", "cloud");
  public static final List<String> NIVEIS = List.of("estagiario", "junior", "pleno", "senior");
  public static final List<String> TIPOS_RENDA = List.of(FIXED_INCOME_TYPE, VARIABLE_INCOME_TYPE);
  public static final List<String> REGIOES =
      List.of("SP", "RJ", "MG", "ES", "PR", "SC", "RS", "DF", "GO", "BA", "PE", "CE");

  private static final Set<String> AREA_SET = Set.copyOf(AREAS);
  private static final Set<String> NIVEL_SET = Set.copyOf(NIVEIS);
  private static final Set<String> TIPO_RENDA_SET = Set.copyOf(TIPOS_RENDA);
  private static final Set<String> REGIAO_SET = Set.copyOf(REGIOES);

  private static final Map<String, Map<String, BigDecimal>> SALARIO_BASE = buildSalaryBase();

  private DomainCatalog() {}

  public static boolean isValidArea(String area) {
    return area != null && AREA_SET.contains(area);
  }

  public static boolean isValidNivel(String nivel) {
    return nivel != null && NIVEL_SET.contains(nivel);
  }

  public static boolean isValidTipoRenda(String tipoRenda) {
    return tipoRenda != null && TIPO_RENDA_SET.contains(tipoRenda);
  }

  public static boolean isValidRegiao(String regiao) {
    return regiao != null && REGIAO_SET.contains(regiao);
  }

  public static BigDecimal getBaseByAreaAndNivel(String area, String nivel) {
    Map<String, BigDecimal> byNivel = SALARIO_BASE.get(area);
    if (byNivel == null) {
      throw new IllegalArgumentException("Area invalida para salario base.");
    }

    BigDecimal value = byNivel.get(nivel);
    if (value == null) {
      throw new IllegalArgumentException("Nivel invalido para salario base.");
    }

    return value;
  }

  public static BigDecimal getAverageBaseByArea(String area) {
    Map<String, BigDecimal> byNivel = SALARIO_BASE.get(area);
    if (byNivel == null) {
      throw new IllegalArgumentException("Area invalida para salario base.");
    }

    return average(byNivel.values().stream().toList());
  }

  public static BigDecimal getAverageBaseByNivel(String nivel) {
    if (!isValidNivel(nivel)) {
      throw new IllegalArgumentException("Nivel invalido para salario base.");
    }

    List<BigDecimal> values =
        AREAS.stream().map(area -> getBaseByAreaAndNivel(area, nivel)).toList();

    return average(values);
  }

  private static Map<String, Map<String, BigDecimal>> buildSalaryBase() {
    Map<String, Map<String, BigDecimal>> base = new LinkedHashMap<>();
    base.put(
        "backend",
        Map.of(
            "estagiario", BigDecimal.valueOf(2000),
            "junior", BigDecimal.valueOf(5000),
            "pleno", BigDecimal.valueOf(8750),
            "senior", BigDecimal.valueOf(15500)));
    base.put(
        "frontend",
        Map.of(
            "estagiario", BigDecimal.valueOf(1700),
            "junior", BigDecimal.valueOf(4250),
            "pleno", BigDecimal.valueOf(7250),
            "senior", BigDecimal.valueOf(12500)));
    base.put(
        "data",
        Map.of(
            "estagiario", BigDecimal.valueOf(2400),
            "junior", BigDecimal.valueOf(6250),
            "pleno", BigDecimal.valueOf(11000),
            "senior", BigDecimal.valueOf(19500)));
    base.put(
        "cloud",
        Map.of(
            "estagiario", BigDecimal.valueOf(2150),
            "junior", BigDecimal.valueOf(6250),
            "pleno", BigDecimal.valueOf(11500),
            "senior", BigDecimal.valueOf(21500)));
    return Map.copyOf(base);
  }

  private static BigDecimal average(List<BigDecimal> values) {
    BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    return sum.divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
  }
}
