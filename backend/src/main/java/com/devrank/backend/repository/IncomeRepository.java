package com.devrank.backend.repository;

import com.devrank.backend.model.Income;
import com.devrank.backend.repository.projection.GroupAverageProjection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncomeRepository extends JpaRepository<Income, UUID> {

  List<Income> findByUser_IdOrderByDataDescIdDesc(UUID userId);

  Optional<Income> findByIdAndUser_Id(UUID id, UUID userId);

  Optional<Income> findTopByUser_IdOrderByDataDescIdDesc(UUID userId);

  @Query("select avg(i.valor) from Income i where i.user.id = :userId and i.area = :area")
  Double findAverageByUserAndArea(@Param("userId") UUID userId, @Param("area") String area);

  @Query("select avg(i.valor) from Income i where i.area = :area")
  Double findAverageByArea(@Param("area") String area);

  @Query("select i.area as grupo, avg(i.valor) as media from Income i group by i.area order by avg(i.valor) desc")
  List<GroupAverageProjection> findGlobalAverageByArea();

  @Query("select i.nivel as grupo, avg(i.valor) as media from Income i group by i.nivel order by avg(i.valor) desc")
  List<GroupAverageProjection> findGlobalAverageByNivel();
}
