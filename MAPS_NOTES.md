# Notas de mapas — Docão Shooter

## Escala

**1 unidade do jogo = 1 metro.**

O código trata a unidade como metro o tempo todo (raios de explosão de 5 m e 6 m, cobertura a até 7 m, rocket jump de cerca de 2,5 m). As constantes em `shared/rules.js` fecham com um Docão um pouco mais alto que um soldado real:

| Medida | Valor | Em metros |
|---|---|---|
| Altura do corpo (`HEIGHT`) | 2,0 | 2,0 m |
| Olho (`EYE`) | 1,6 | 1,6 m |
| Raio do corpo (`RADIUS`) | 0,42 | largura 0,84 m |
| Corrida (`SPEED`) | 6,8 | 6,8 m/s |
| Passo automático (`STEP`) | 0,45 | sobe até 0,45 m sem pular |
| Pulo | `JUMP` 8,5, `GRAV` −24 | altura ≈ 1,5 m |
| Parede típica | 0,5 | 0,5 m de espessura |
| Porta dos prédios | vão ≥ 2,6, altura 2,6 | cabe o Docão de 2,0 m com folga |
| Pé-direito de andar | 3,3–3,6 | laje de 0,3 m; vão livre ≈ 3,0–3,3 m |

Uma porta real de 2,1 m bateria na cabeça. Por isso as portas daqui são mais altas e mais largas que as do CoD, e os corredores apertados ficam perto de 2,5–3,5 m em vez de 1,5 m: abaixo disso o corpo trava.

O chão global é y = 0. Não existe volume de morte. O limite do mapa é uma parede com colisão de 40 m (`WALL_COLLIDE_H`). Queda fatal de penhasco, no motor atual, vira parede de rocha: dá para ver o abismo, não dá para cair nele nem ficar preso no fundo.

## Posto Nevasca (rodada 1) — referência Summit (BO1)

Nome original. Layout em linha, não cópia: planta lida do minimapa com grid A1–E5 e do bird's eye do dossiê (`summit/DOSSIE.md`). Escala adotada lá: área jogável ≈ 50 × 120 m, tolerância ±20%.

Eixo longo no Z. Norte (+Z) = lab / spawn 1. Sul (−Z) = galpão e estrada / spawn 2. Oeste (−X) = penhasco. Leste (+X) = salas estreitas.

| Área | Caixa (m) | Notas |
|---|---|---|
| Mapa | 52 × 120 (`size` [26, 60]) | dentro do ±20% de 50 × 120 |
| Lab norte | x −14…10, z 48…58 (24 × 10), altura 3,5 | 1 andar, duas portas pro pátio, divisória em z = 53,2 |
| Prédio do meio (B3) | x −12…2, z 33…45 (14 × 12) | 2 andares, mezanino a +3,4 m, rampa interna no eixo X |
| Garagem | x 8…18, z 34…46 (10 × 12), altura 3,6 | portão largo no sul |
| Sala Fria (control room) | x −2…20, z 6…28 (22 × 22) | dossiê pedia ~25 × 20. 5 portas. Mezanino a **+3,4 m** (dossiê +3 m). Átrio aberto no meio. Claraboia ~7 × 7 m no teto a +6,8 m. Guarda-corpo de 1,0 m |
| Salas leste | x 20…26, z 8…32 (6 × 24), altura 3,3 | CQB, duas divisórias, a parede oeste é a da Sala Fria |
| Passarela do penhasco | x −24,6…−21,2 (vão ~3,4), z −6…36 | dossiê: corredor de 2,5–3,5 m. Muro de rocha de 8 m no oeste. Guarda-corpo de 1,05 m (não tampa o olho a 1,6 m) |
| Teleférico | cabine x −26…−22,7, z 42…47 | piso a **+2,37 m**, vão interno 2,6 m, rampa a partir do pátio. O rasgo do penhasco fica entre z 41,5 e 48,2 |
| Torre do cabo | plataforma x −20,5…−15,5, z 37…42 | piso a **+8,15 m** (dossiê +8…12 m). Duas rampas (0→4,05→8,15), porque o pulo só sobe 1,5 m |
| Pátio sul | z −30…6, com caminhão, tanque e barris | cobertura a ≤ 7,2 m |
| Galpão sul | x −12…12, z −46…−30 (24 × 16), altura 3,6 | telhado andável, mureta de 1,15 m, rampa pelo sul, antena |
| Neve no telhado | 0,28–0,35 | dossiê: 20–40 cm |
| Montes | 0,55–1,0, base ≤ 2 m | dossiê: 0,5–1 m. Base pequena para o teste de “campo aberto” não contar o topo do monte |
| Neblina | `#C9D3DC`, linear 48→170 m | dossiê: some por volta de 150–200 m |
| Céu | `#D5DEE6`, sol frio e fraco | nublado |
| Neve caindo | 1400 pontos, um draw call, vento +x | flocos param em cima dos telhados listados. Sem malha por floco (Safari) |
| Pinheiros | `InstancedMesh`, 2 draw calls | 6 árvores |

Spawns: 6 no norte (z 38…52) e 6 no sul (z −58…−44), distância mínima 4,5 m. O jogo não tem lista separada por time: na Dominação o renascimento ignora aliado e foge da linha de visão inimiga, então as duas pontas funcionam como os spawns dos times. Travessia reta das pontas ≈ 100 m / 6,8 m/s ≈ 15 s; com o miolo, perto dos 18–22 s do dossiê.

Linha longa medida na auditoria: 112 m (a passarela e o flanco oeste ainda estão retos demais; a meta do dossiê é 40–60 m). Visão quebrada: 21% dos pares a ≥ 10 m se enxergam (teto do teste: 30%). Ponto mais aberto: 7,2 m.

Rodada 2, quando chegar print de comparação: quebrar a reta de 112 m no meio da passarela, e decidir se o penhasco ganha volume de morte de verdade.
