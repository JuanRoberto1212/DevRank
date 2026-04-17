package com.devrank.backend.controller;

import com.devrank.backend.dto.stats.GroupAverageResponse;
import com.devrank.backend.dto.stats.UserComparisonResponse;
import com.devrank.backend.service.StatsService;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/stats")
@RequiredArgsConstructor
public class StatsController {

  private final StatsService statsService;

  @GetMapping("/media-area")
  public List<GroupAverageResponse> getAverageByArea() {
    return statsService.getAverageByArea();
  }

  @GetMapping("/media-nivel")
  public List<GroupAverageResponse> getAverageByNivel() {
    return statsService.getAverageByNivel();
  }

  @GetMapping("/comparacao")
  public UserComparisonResponse compare(Principal principal) {
    return statsService.compareUserWithProfileBenchmark(principal.getName());
  }
}
