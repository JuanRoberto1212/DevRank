package com.devrank.backend.service;

import com.devrank.backend.domain.DomainCatalog;
import com.devrank.backend.dto.stats.GroupAverageResponse;
import com.devrank.backend.dto.stats.UserComparisonResponse;
import com.devrank.backend.model.Income;
import com.devrank.backend.model.User;
import com.devrank.backend.repository.IncomeRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StatsService {

  private final IncomeRepository incomeRepository;
  private final CurrentUserService currentUserService;

  public List<GroupAverageResponse> getAverageByArea() {
    return DomainCatalog.AREAS.stream()
        .map(area -> new GroupAverageResponse(area, DomainCatalog.getAverageBaseByArea(area)))
        .toList();
  }

  public List<GroupAverageResponse> getAverageByNivel() {
    return DomainCatalog.NIVEIS.stream()
        .map(nivel -> new GroupAverageResponse(nivel, DomainCatalog.getAverageBaseByNivel(nivel)))
        .toList();
  }

  public UserComparisonResponse compareUserWithProfileBenchmark(String authenticatedEmail) {
    User user = currentUserService.getByEmail(authenticatedEmail);
    ComparisonProfile profile = resolveComparisonProfile(user);

    BigDecimal userFixedTotal =
        money(incomeRepository.findSumByUserAndTipo(user.getId(), DomainCatalog.FIXED_INCOME_TYPE));
    BigDecimal marketAverage = money(DomainCatalog.getBaseByAreaAndNivel(profile.area(), profile.nivel()));
    BigDecimal differencePercent = calculateDifferencePercent(userFixedTotal, marketAverage);

    return new UserComparisonResponse(
        profile.area(),
        profile.nivel(),
        userFixedTotal,
        marketAverage,
        differencePercent,
        resolveStatus(differencePercent));
  }

  private ComparisonProfile resolveComparisonProfile(User user) {
    String userArea = normalizeLower(user.getArea());
    String userNivel = normalizeLower(user.getNivel());

    boolean validUserArea = DomainCatalog.isValidArea(userArea);
    boolean validUserNivel = DomainCatalog.isValidNivel(userNivel);
    if (validUserArea && validUserNivel) {
      return new ComparisonProfile(userArea, userNivel);
    }

    Income latestIncome =
        incomeRepository
            .findTopByUser_IdOrderByDataDescIdDesc(user.getId())
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Usuario sem perfil valido e sem renda para definir area/nivel de comparacao."));

    String incomeArea = normalizeLower(latestIncome.getArea());
    String incomeNivel = normalizeLower(latestIncome.getNivel());
    if (!DomainCatalog.isValidArea(incomeArea) || !DomainCatalog.isValidNivel(incomeNivel)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Area ou nivel da renda mais recente nao sao validos.");
    }

    return new ComparisonProfile(incomeArea, incomeNivel);
  }

  private BigDecimal calculateDifferencePercent(BigDecimal userValue, BigDecimal marketAverage) {
    if (marketAverage.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    return userValue
        .subtract(marketAverage)
        .multiply(BigDecimal.valueOf(100))
        .divide(marketAverage, 2, RoundingMode.HALF_UP);
  }

  private String resolveStatus(BigDecimal differencePercent) {
    int comparison = differencePercent.compareTo(BigDecimal.ZERO);
    if (comparison > 0) {
      return "ACIMA_DA_MEDIA";
    }
    if (comparison < 0) {
      return "ABAIXO_DA_MEDIA";
    }
    return "NA_MEDIA";
  }

  private BigDecimal money(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private String normalizeLower(String value) {
    if (value == null) {
      return null;
    }
    return value.trim().toLowerCase(Locale.ROOT);
  }

  private record ComparisonProfile(String area, String nivel) {}
}
