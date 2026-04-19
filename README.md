# TreinoPro

Aplicacao web para gerar treinos personalizados com base em um backend Supabase.

## O que o projeto faz

- coleta dados de anamnese do usuario
- escolhe template de treino com base em objetivo, nivel e dias por semana
- seleciona exercicios conforme catalogo, matches, regras, equipamentos e limitacoes
- aplica prescricoes de series, repeticoes, descanso, RIR e tempo
- salva o treino gerado no Supabase e no navegador

## Estrutura principal

```text
.
|-- index.html
|-- css/
|   `-- styles.css
|-- js/
|   |-- app.js
|   `-- supabase.js
|-- backend-supabase/
|   `-- scripts SQL salvos do projeto
|-- supabase/
|   |-- config.toml
|   `-- migrations/
|-- tools/
|   |-- generate_catalog_expansion.mjs
|   `-- generate_catalog_expansion.py
```

## Banco de dados

O projeto usa Supabase como backend principal.

Hoje o banco contem:

- catalogo expandido de exercicios
- templates de treino
- regras de elegibilidade
- prescricoes por contexto
- matches entre slots de treino e exercicios

As migrations relevantes estao em [supabase/migrations](./supabase/migrations).

## Interface

O site foi organizado em tres areas:

- `Gerar treino`
- `Meu treino`
- `Base de treino`

Tudo o que aparece na interface foi pensado para conversar com o banco de dados e com a geracao do treino.

## Publicacao local

Como o projeto e estatico no frontend, basta abrir `index.html` ou servir a pasta com um servidor local simples.

Exemplo com Node:

```bash
npx serve .
```

## Observacao

As mudancas de banco foram aplicadas no projeto Supabase e tambem ficaram registradas nas migrations e nos arquivos SQL salvos em `backend-supabase/`.
