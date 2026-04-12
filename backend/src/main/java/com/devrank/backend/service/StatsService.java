package com.devrank.backend.service;

import com.devrank.backend.dto.stats.GroupAverageResponse;
import com.devrank.backend.dto.stats.UserComparisonResponse;
import com.devrank.backend.model.Income;
import com.devrank.backend.model.User;
import com.devrank.backend.repository.IncomeRepository;
import com.devrank.backend.repository.projection.GroupAverageProjection;
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
    return incomeRepository.findGlobalAverageByArea().stream()
        .map(this::toGroupAverageResponse)
        .toList();
  }

  public List<GroupAverageResponse> getAverageByNivel() {
    return incomeRepository.findGlobalAverageByNivel().stream()
        .map(this::toGroupAverageResponse)
        .toList();
  }

  public UserComparisonResponse compareUserWithAreaAverage(String authenticatedEmail, String area) {
    User user = currentUserService.getByEmail(authenticatedEmail);
    String areaToCompare = resolveAreaToCompare(user, area);

    Double userAverageValue = incomeRepository.findAverageByUserAndArea(user.getId(), areaToCompare);
    if (userAverageValue == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Usuario nao possui ganhos na area informada.");
    }

    Double marketAverageValue = incomeRepository.findAverageByArea(areaToCompare);
    if (marketAverageValue == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Nao existem dados de mercado para a area informada.");
    }

    BigDecimal userAverage = toMoney(userAverageValue);
    BigDecimal marketAverage = toMoney(marketAverageValue);
    BigDecimal differencePercent = calculateDifferencePercent(userAverage, marketAverage);

    return new UserComparisonResponse(
        areaToCompare, userAverage, marketAverage, differencePercent, resolveStatus(differencePercent));
  }

  private GroupAverageResponse toGroupAverageResponse(GroupAverageProjection projection) {
    return new GroupAverageResponse(projection.getGrupo(), toMoney(projection.getMedia()));
  }

  private String resolveAreaToCompare(User user, String area) {
    if (area != null && !area.isBlank()) {
      return normalizeLower(area);
    }

    Income latestIncome =
        incomeRepository
            .findTopByUser_IdOrderByDataDescIdDesc(user.getId())
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Usuario nao possui ganhos para comparacao."));

    return latestIncome.getArea();
  }

  private BigDecimal calculateDifferencePercent(BigDecimal userAverage, BigDecimal marketAverage) {
    if (marketAverage.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    return userAverage
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

  private BigDecimal toMoney(Double value) {
    return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
  }

  private String normalizeLower(String value) {
    return value.trim().toLowerCase(Locale.ROOT);
  }
}
