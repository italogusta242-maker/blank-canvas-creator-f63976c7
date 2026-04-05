import { parseWorkoutDescription } from './src/components/training/helpers.ts';

const textTest = `Cadeira extensora
1º série- 15 repetições com dois segundos de isometria
em cima
2º série- 15 diretas- aumento de carga
3º série- 12 repetições- suba um bloco de carga
4º série- (cluterset) 5-5-5-5. Coloque uma carga muito
alta e faça uma pausa de 20 segundos a cada 5
repetições, depois sem descanso reduza muito a
carga e faça 20 repetições rápidas

Leg press unilateral
Use carga leve
Descanse 1:00min.
4 séries de 10 repetições no leg press unilateral

Afundo no smith
1º série- 14 repetições
2º série- 14 repetições segurando 2 segundos em
baixo, mantenha carga na 1ª série.
3º série- 10 repetições diretas com carga alta.
Reduz carga para metade e faça 20 repetições com
peso do corpo

Agachamento
5 séries de 14 repetições

Passada
4 séries de 10 repetições com peso nas duas mãos +
10 somente peso do corpo`;

console.log(JSON.stringify(parseWorkoutDescription(textTest), null, 2));
