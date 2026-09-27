---
titulo: "Síntesis de HDL Zn-Al por coprecipitación a pH constante"
titulo_corto: "HDL Zn-Al"
subtitulo: "Ejemplo de guion para importar_markdown (datos ilustrativos)"
autores: [Nombre Apellido]
institucion: "Posgrado en Química"
fecha: "Reunión de grupo"
tema: marino
---
<!-- minutos: 0.5 -->

Notas:
Todas las cifras de este guion son ilustrativas: sirven para probar el formato,
no son resultados de un experimento. Sustitúyelas por las tuyas.

# Contexto

## Los HDL son láminas cargadas con aniones intercambiables
<!-- minutos: 1.5 -->
- Láminas tipo brucita en las que parte del Zn²⁺ se sustituye por Al³⁺
  - La sustitución deja una carga positiva por cada Al³⁺
  - Aniones y agua en la intercapa compensan esa carga
- La fracción $x = \mathrm{Al}/(\mathrm{Zn}+\mathrm{Al})$ suele ir de 0,20 a 0,33

$$[\mathrm{Zn}_{1-x}\mathrm{Al}_x(\mathrm{OH})_2]^{x+}(\mathrm{A}^{n-})_{x/n}\cdot m\,\mathrm{H_2O}$$

Notas:
Recordar que la carga de la lámina la fija x, y con ella la cantidad de anión
en la intercapa.

## Coprecipitación con Zn/Al = 3
<!-- minutos: 2 -->
- Disolución de nitratos de Zn y Al, goteo lento
- pH constante con NaOH y Na₂CO₃
- Envejecimiento, lavado y secado

```chem
0.75 Zn^2+ + 0.25 Al^3+ + 2 OH- + 0.125 CO3^2- + m H2O -> Zn_{0.75}Al_{0.25}(OH)2(CO3)_{0.125} * m H2O v
```

> nota: La reacción está balanceada en carga para x = 0,25; m depende del secado.

# Resultados

## DRX: reflexiones basales de la fase HDL
<!-- minutos: 3 -->
::: columnas 60
![Difractograma ilustrativo de la muestra a pH 9 (radiación Cu Kα).](figs/drx-zn-al.png "Difractograma con las reflexiones (003) y (006) marcadas"){w=100}
|||
- (003) y (006): reflexiones basales
- Ley de Bragg: $n\lambda = 2d\sin\theta$
- Con $\lambda = 1{,}5406$ Å, la posición de (003) da el espacio basal
:::

Notas:
Señalar (003) y (006). Explicar que el espacio basal depende del anión de la
intercapa y del grado de hidratación.

## Comparación entre pH de síntesis
<!-- minutos: 2.5 -->
| Muestra | pH | $d_{003}$ (Å) | Tamaño de cristalita (nm) |
|---|---|---|---|
| ZA-8 | 8 | 7,61 | 12 |
| ZA-9 | 9 | 7,58 | 18 |
| ZA-10 | 10 | 7,59 | 15 |

Tabla: Valores ilustrativos. Tamaño de cristalita estimado con la ecuación de Scherrer sobre (003).

$$\tau = \frac{K\lambda}{\beta\cos\theta}$$

## Cálculo reproducible
<!-- minutos: 1 -->
```python
import numpy as np

lam = 1.5406                            # Å, Cu Kα
dos_theta = 11.65                       # grados, (003) ilustrativo
d003 = lam / (2 * np.sin(np.radians(dos_theta / 2)))
print(f"d003 = {d003:.2f} Å")
```

---
<!-- diseno: enunciado -->
<!-- minutos: 1 -->
### En este ejemplo, pH 9 daría la fase más ordenada

Notas:
Cerrar insistiendo en que es un ejemplo: con datos reales, la conclusión puede
ser otra.
