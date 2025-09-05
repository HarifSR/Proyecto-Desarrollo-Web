
/* ---------- Base de datos ---------- */
IF DB_ID(N'DB_CAB') IS NULL
BEGIN
  CREATE DATABASE DB_CAB;
END
GO
ALTER DATABASE DB_CAB SET RECOVERY SIMPLE;
GO
USE DB_CAB;
GO


/* ---------- Esquema ---------- */
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'cab')
    EXEC('CREATE SCHEMA cab AUTHORIZATION dbo');
GO

/* ============================================================
   Catálogos
   ============================================================ */

/* Grupos focales */
CREATE TABLE cab.grupos_focales (
  id      TINYINT       NOT NULL PRIMARY KEY,
  nombre  VARCHAR(30)   NOT NULL UNIQUE
);
GO
INSERT INTO cab.grupos_focales(id,nombre) VALUES
 (1,'Embarazadas'),
 (2,'0-6m'),
 (3,'6-24m');
GO

/* Categorías de pregunta */
CREATE TABLE cab.categorias_pregunta (
  id      TINYINT       NOT NULL IDENTITY(1,1) PRIMARY KEY,
  nombre  VARCHAR(60)   NOT NULL UNIQUE
);
GO

/* Usuarios */
CREATE TABLE cab.usuarios (
  id         BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  nombre     VARCHAR(120)  NOT NULL,
  correo     VARCHAR(120)  NOT NULL UNIQUE,
  pass_hash  VARCHAR(255)  NOT NULL,
  rol        VARCHAR(20)   NOT NULL
              CONSTRAINT CK_usuarios_rol CHECK (rol IN ('ADMIN','ENCUESTADOR')),
  activo     BIT           NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT (1),
  creado_en  DATETIME2(0)  NOT NULL CONSTRAINT DF_usuarios_creado DEFAULT (SYSDATETIME())
);
GO

/* Ubicaciones (Depto/Muni/Área/Comunidad únicas) */
CREATE TABLE cab.ubicaciones (
  id            BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  departamento  VARCHAR(80)   NOT NULL,
  municipio     VARCHAR(80)   NOT NULL,
  area          VARCHAR(10)   NOT NULL
                 CONSTRAINT CK_ubicaciones_area CHECK (area IN ('Urbana','Rural')),
  comunidad     VARCHAR(120)  NOT NULL,
  CONSTRAINT UQ_ubicaciones UNIQUE (departamento, municipio, area, comunidad)
);
GO

/* ============================================================
   Definición de encuestas y preguntas
   ============================================================ */

/* Encuestas (publicables) */
CREATE TABLE cab.encuestas (
  id              BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  titulo          VARCHAR(120)  NOT NULL,
  descripcion     VARCHAR(500)  NULL,
  grupo_focal_id  TINYINT       NOT NULL
                   CONSTRAINT FK_encuestas_grupofocal REFERENCES cab.grupos_focales(id),
  version         VARCHAR(10)   NOT NULL,  -- e.g., 'v1.0'
  estado          VARCHAR(10)   NOT NULL
                   CONSTRAINT CK_encuestas_estado CHECK (estado IN ('Activa','Inactiva'))
                   CONSTRAINT DF_encuestas_estado DEFAULT ('Inactiva'),
  vigente_desde   DATE          NULL,
  vigente_hasta   DATE          NULL,
  creado_en       DATETIME2(0)  NOT NULL CONSTRAINT DF_encuestas_creado DEFAULT (SYSDATETIME()),
  CONSTRAINT UQ_encuestas_titulo_version UNIQUE (titulo, version)
);
GO

/* Plantillas de opciones reutilizables */
CREATE TABLE cab.plantillas_opciones (
  id          BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  nombre      VARCHAR(120)  NOT NULL UNIQUE,
  descripcion VARCHAR(300)  NULL
);
GO

CREATE TABLE cab.plantilla_opcion_items (
  id            BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  plantilla_id  BIGINT        NOT NULL
                 CONSTRAINT FK_item_plantilla REFERENCES cab.plantillas_opciones(id),
  etiqueta      VARCHAR(100)  NOT NULL,   -- 'Sí', 'A veces', ...
  valor         VARCHAR(50)   NOT NULL,   -- 'si', 'a_veces', ...
  puntos        INT           NOT NULL,   -- 0..puntaje_maximo de la pregunta
  orden         INT           NOT NULL,
  CONSTRAINT UQ_item_plantilla_valor UNIQUE (plantilla_id, valor)
);
GO

/* Preguntas */
CREATE TABLE cab.preguntas (
  id                      BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  encuesta_id             BIGINT        NOT NULL
                          CONSTRAINT FK_preguntas_encuesta  REFERENCES cab.encuestas(id),
  categoria_id            TINYINT       NULL
                          CONSTRAINT FK_preguntas_categoria REFERENCES cab.categorias_pregunta(id),
  texto                   VARCHAR(300)  NOT NULL,
  tipo                    VARCHAR(20)   NOT NULL
                          CONSTRAINT CK_preguntas_tipo CHECK (
                            tipo IN ('OpcionUnica','OpcionMultiple','Numerica','SiNo','Fecha','Texto')
                          ),
  requerida               BIT           NOT NULL CONSTRAINT DF_preguntas_requerida DEFAULT (1),
  orden                   INT           NOT NULL,
  puntaje_maximo          INT           NOT NULL CONSTRAINT DF_preguntas_pmax DEFAULT (100),
  plantilla_opciones_id   BIGINT        NULL
                          CONSTRAINT FK_preguntas_plantilla REFERENCES cab.plantillas_opciones(id),
  CONSTRAINT UQ_preguntas_encuesta_orden UNIQUE (encuesta_id, orden)
);
GO

/* Opciones ad-hoc por pregunta */
CREATE TABLE cab.preguntas_opciones_extra (
  id           BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  pregunta_id  BIGINT        NOT NULL
               CONSTRAINT FK_popt_preg REFERENCES cab.preguntas(id),
  etiqueta     VARCHAR(100)  NOT NULL,
  valor        VARCHAR(50)   NOT NULL,
  puntos       INT           NOT NULL,
  orden        INT           NOT NULL,
  CONSTRAINT UQ_popt_preg_valor UNIQUE (pregunta_id, valor)
);
GO

/* ============================================================
   Captura · Boletas / Respuestas
   ============================================================ */

/* Encabezado de respuesta (boleta) */
CREATE TABLE cab.respuestas (
  id              BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  boleta_num      BIGINT        NOT NULL,         -- correlativo visible
  encuesta_id     BIGINT        NOT NULL
                  CONSTRAINT FK_resp_encuesta    REFERENCES cab.encuestas(id),
  ubicacion_id    BIGINT        NOT NULL
                  CONSTRAINT FK_resp_ubicacion   REFERENCES cab.ubicaciones(id),
  encuestador_id  BIGINT        NOT NULL
                  CONSTRAINT FK_resp_encuestador REFERENCES cab.usuarios(id),
  aplicada_en     DATETIME2(0)  NOT NULL CONSTRAINT DF_respuestas_aplicada DEFAULT (SYSDATETIME()),
  estado          VARCHAR(10)   NOT NULL
                  CONSTRAINT CK_respuestas_estado CHECK (estado IN ('Enviada','Anulada'))
                  CONSTRAINT DF_respuestas_estado DEFAULT ('Enviada'),
  -- Auditoría de anulación:
  anulada_motivo  VARCHAR(300)  NULL,
  anulada_por     BIGINT        NULL,  -- (opcional) FK lógica a cab.usuarios.id
  anulada_en      DATETIME2(0)  NULL,

  CONSTRAINT UQ_respuestas_boleta UNIQUE (boleta_num)
);
GO

CREATE INDEX IX_respuestas_encuesta_aplicada ON cab.respuestas (encuesta_id, aplicada_en);
CREATE INDEX IX_respuestas_ubicacion_aplicada ON cab.respuestas (ubicacion_id, aplicada_en);
GO

/* Detalle de respuesta */
CREATE TABLE cab.respuestas_detalle (
  id             BIGINT         NOT NULL IDENTITY(1,1) PRIMARY KEY,
  respuesta_id   BIGINT         NOT NULL
                 CONSTRAINT FK_rdet_respuesta FOREIGN KEY (respuesta_id)
                 REFERENCES cab.respuestas(id) ON DELETE CASCADE,
  pregunta_id    BIGINT         NOT NULL
                 CONSTRAINT FK_rdet_pregunta  FOREIGN KEY (pregunta_id)
                 REFERENCES cab.preguntas(id),
  origen         VARCHAR(10)    NOT NULL
                  CONSTRAINT CK_rdet_origen CHECK (origen IN ('PLANTILLA','EXTRA','LIBRE')),
  opcion_ref_id  BIGINT         NULL,            -- id de plantilla_opcion_items o preguntas_opciones_extra (polimórfico)
  valor_numerico DECIMAL(10,2)  NULL,
  valor_texto    VARCHAR(500)   NULL,
  puntos         INT            NOT NULL CONSTRAINT DF_rdet_puntos DEFAULT (0),   -- bruto
  puntaje_0a10   DECIMAL(5,2)   NOT NULL,                                          -- calculado
  CONSTRAINT UQ_rdet_respuesta_preg UNIQUE (respuesta_id, pregunta_id)
);
GO

/* ============================================================
   TRIGGERS · Ajuste de puntos y cálculo de puntaje_0a10
   ============================================================ */
CREATE OR ALTER TRIGGER cab.tg_respuestas_detalle_bi
ON cab.respuestas_detalle
INSTEAD OF INSERT
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO cab.respuestas_detalle
    (respuesta_id, pregunta_id, origen, opcion_ref_id, valor_numerico, valor_texto, puntos, puntaje_0a10)
  SELECT
    i.respuesta_id,
    i.pregunta_id,
    i.origen,
    i.opcion_ref_id,
    i.valor_numerico,
    i.valor_texto,
    CASE
      WHEN i.puntos < 0 THEN 0
      WHEN i.puntos > p.puntaje_maximo THEN p.puntaje_maximo
      ELSE i.puntos
    END AS puntos_ajustados,
    CAST(
      CASE
        WHEN NULLIF(p.puntaje_maximo,0) IS NULL THEN 0
        ELSE (CAST(
               CASE
                 WHEN i.puntos < 0 THEN 0
                 WHEN i.puntos > p.puntaje_maximo THEN p.puntaje_maximo
                 ELSE i.puntos
               END AS DECIMAL(10,4)
             ) / p.puntaje_maximo) * 10.0
      END
    AS DECIMAL(5,2)) AS puntaje_0a10
  FROM inserted i
  JOIN cab.preguntas p
    ON p.id = i.pregunta_id;
END
GO

CREATE OR ALTER TRIGGER cab.tg_respuestas_detalle_bu
ON cab.respuestas_detalle
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT (UPDATE(puntos) OR UPDATE(pregunta_id))
    RETURN;

  ;WITH C AS (
    SELECT d.id, d.puntos, d.pregunta_id
    FROM cab.respuestas_detalle d
    JOIN inserted i ON i.id = d.id
  )
  UPDATE d
    SET puntos =
          CASE
            WHEN C.puntos < 0 THEN 0
            WHEN C.puntos > p.puntaje_maximo THEN p.puntaje_maximo
            ELSE C.puntos
          END,
        puntaje_0a10 =
          CAST(
            CASE
              WHEN NULLIF(p.puntaje_maximo,0) IS NULL THEN 0
              ELSE (CAST(
                     CASE
                       WHEN C.puntos < 0 THEN 0
                       WHEN C.puntos > p.puntaje_maximo THEN p.puntaje_maximo
                       ELSE C.puntos
                     END AS DECIMAL(10,4)
                   ) / p.puntaje_maximo) * 10.0
            END
          AS DECIMAL(5,2))
  FROM cab.respuestas_detalle d
  JOIN C ON C.id = d.id
  JOIN cab.preguntas p ON p.id = C.pregunta_id;
END
GO

/* ============================================================
   GUARDRAILS · Estados Enviada/Anulada
   ============================================================ */

/* 1) Permite SOLO transición Enviada -> Anulada */
CREATE OR ALTER TRIGGER cab.tg_respuestas_transicion
ON cab.respuestas
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT UPDATE(estado) RETURN;

  -- Bloquear Anulada -> Enviada y valores fuera del dominio
  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN deleted  d ON d.id = i.id
    WHERE (d.estado = 'Anulada' AND i.estado = 'Enviada')
       OR (d.estado NOT IN ('Enviada','Anulada') OR i.estado NOT IN ('Enviada','Anulada'))
  )
  BEGIN
    RAISERROR('Transición de estado no permitida.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END;
END
GO

/* 2) Bloquea ediciones de encabezado cuando está Anulada (salvo columnas de auditoría) */
CREATE OR ALTER TRIGGER cab.tg_respuestas_noedit_anulada
ON cab.respuestas
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN deleted  d ON d.id = i.id
    WHERE d.estado = 'Anulada'
      AND (
           ISNULL(i.boleta_num,0)      <> ISNULL(d.boleta_num,0) OR
           ISNULL(i.encuesta_id,0)     <> ISNULL(d.encuesta_id,0) OR
           ISNULL(i.ubicacion_id,0)    <> ISNULL(d.ubicacion_id,0) OR
           ISNULL(i.encuestador_id,0)  <> ISNULL(d.encuestador_id,0) OR
           ISNULL(i.aplicada_en,'')    <> ISNULL(d.aplicada_en,'')
         )
  )
  BEGIN
    RAISERROR('No se puede editar una respuesta ANULADA.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END
END
GO

/* 3) Bloquea cambios en detalles si la boleta está Anulada (versión sin CTE) */
CREATE OR ALTER TRIGGER cab.tg_rdet_bloqueo_anulada
ON cab.respuestas_detalle
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Affected TABLE (respuesta_id BIGINT PRIMARY KEY);

  INSERT INTO @Affected(respuesta_id)
  SELECT respuesta_id FROM inserted
  UNION
  SELECT respuesta_id FROM deleted;

  IF EXISTS (
    SELECT 1
    FROM @Affected a
    JOIN cab.respuestas r ON r.id = a.respuesta_id
    WHERE r.estado = 'Anulada'
  )
  BEGIN
    RAISERROR('No se pueden modificar detalles de una respuesta ANULADA.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END
END
GO

/* ============================================================
   Vista + Procedimiento de anulación
   ============================================================ */

CREATE OR ALTER VIEW cab.vw_respuestas_validas AS
SELECT *
FROM cab.respuestas
WHERE estado = 'Enviada';
GO

CREATE OR ALTER PROCEDURE cab.sp_anular_respuesta
  @respuesta_id BIGINT,
  @motivo       VARCHAR(300),
  @anulada_por  BIGINT
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE cab.respuestas
    SET estado         = 'Anulada',
        anulada_motivo = @motivo,
        anulada_por    = @anulada_por,
        anulada_en     = SYSDATETIME()
  WHERE id = @respuesta_id
    AND estado = 'Enviada';

  IF @@ROWCOUNT = 0
    RAISERROR('No se pudo anular: la boleta no existe o ya está anulada.', 16, 1);
END
GO


