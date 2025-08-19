
-- CREAR LA BASE DE DATOS

CREATE DATABASE DB_CAB;
GO

ALTER DATABASE DB_CAB SET RECOVERY SIMPLE;
GO


USE DB_CAB;
GO


-- CREAR ESQUEMA

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'cab')
    EXEC('CREATE SCHEMA cab AUTHORIZATION dbo');
GO


-- Tabla de Roles
CREATE TABLE cab.Roles(
    id_rol       BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL UNIQUE,
    descripcion  VARCHAR(255) NULL
);

-- Tabla de Usuarios
CREATE TABLE cab.Usuarios(
    id_usuario      BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_usuario  VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password        VARBINARY(256) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    sexo            CHAR(1) NULL,
    activo          BIT NOT NULL CONSTRAINT DF_Usuarios_activo DEFAULT(1),
    creado_en       DATETIME2(0) NOT NULL CONSTRAINT DF_Usuarios_creado_en DEFAULT (SYSUTCDATETIME()),
    creado_por      BIGINT NULL,
    id_rol          BIGINT NULL,
    CONSTRAINT CK_Usuarios_Sexo CHECK (sexo IS NULL OR sexo IN ('M','F')),
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (id_rol) REFERENCES cab.Roles(id_rol),
);
CREATE INDEX IX_Usuarios_Rol    ON cab.Usuarios(id_rol);
CREATE INDEX IX_Usuarios_Activo ON cab.Usuarios(activo);


-- Tabla de Departamentos
CREATE TABLE cab.Departamentos(
    id_departamento INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL UNIQUE
);

-- Tabla de Municipios
CREATE TABLE cab.Municipios(
    id_municipio    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_departamento INT NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    CONSTRAINT FK_Municipios_Departamentos FOREIGN KEY (id_departamento) REFERENCES cab.Departamentos(id_departamento),
    CONSTRAINT UX_Municipios_Dep_Nombre UNIQUE (id_departamento, nombre)
);

-- Tabla de Comunidade
CREATE TABLE cab.Comunidades(
    id_comunidad INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_municipio INT NOT NULL,
    nombre       VARCHAR(150) NOT NULL,
    CONSTRAINT FK_Comunidades_Municipios FOREIGN KEY (id_municipio) REFERENCES cab.Municipios(id_municipio),
    CONSTRAINT UX_Comunidades_Mun_Nombre UNIQUE (id_municipio, nombre)
);

--Tabla de Boletas
CREATE TABLE cab.Boletas(
    id_boleta     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tipo_encuesta VARCHAR(120) NOT NULL
);

-- Tabla de Preguntas
CREATE TABLE cab.Preguntas(
    id_pregunta      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_boleta        INT NOT NULL,
    contenido        VARCHAR(500) NOT NULL,
    Tipo_pregunta    VARCHAR(150) NOT NULL,
    CONSTRAINT FK_Preguntas_Boletas FOREIGN KEY (id_boleta) REFERENCES cab.Boletas(id_boleta),
);


   -- Tabla de Resumen_Encuestas
CREATE TABLE cab.Resumen_Encuestas(
    id_resumen_encuesta INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_boleta           INT NOT NULL,
    id_comunidad        INT NOT NULL,
	id_usuario          BIGINT NULL,
    fecha               DATE NOT NULL CONSTRAINT DF_Resumen_fecha DEFAULT (CONVERT(date, SYSUTCDATETIME())),
    folio_boleta        VARCHAR(30) NULL,
    nombre_entrevistada VARCHAR(120) NULL,
    edad_entrevistada   INT NULL CHECK (edad_entrevistada BETWEEN 10 AND 70),
    CONSTRAINT FK_Resumen_Boletas FOREIGN KEY (id_boleta) REFERENCES cab.Boletas(id_boleta),
    CONSTRAINT FK_Resumen_Comunidades FOREIGN KEY (id_comunidad) REFERENCES cab.Comunidades(id_comunidad),
    CONSTRAINT FK_Resumen_Usuarios FOREIGN KEY (id_usuario) REFERENCES cab.Usuarios(id_usuario)
);

-- Tabla de Respuestas
CREATE TABLE cab.Respuestas(
    id_respuesta        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_pregunta         INT NOT NULL,
    puntaje             DECIMAL(6,2) NULL,
    CONSTRAINT FK_Respuestas_Preguntas FOREIGN KEY (id_pregunta) REFERENCES cab.Preguntas(id_pregunta),
);



