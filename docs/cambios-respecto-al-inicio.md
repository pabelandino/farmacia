# Cambios respecto al inicio

Este documento compara Elsa SYS con dos “inicios”:

1. **FarmaPlus de Windows** (el `letty.exe` / FarmaPlusV2 con SQL Server), que era el sistema de la farmacia.
2. **La primera versión web** de Elsa SYS (el MVP: vender, ingresar, productos y caja básicos), antes de los módulos y reglas que se fueron agregando.

---

## 1. Frente a FarmaPlus de Windows

Elsa SYS no es una copia de las ventanas de VB.NET. Recupera los datos del `.bak` y las mismas fórmulas de venta, y cambia lo que en Windows estorbaba o no se podía hacer.

### Lo que se mantiene

- Usuarios, productos, clientes, facturas e ingresos se **importan** del respaldo SQL Server.
- **Importe** = precio × cantidad.
- **Ganancia** = (precio − precio unidad) × cantidad.
- **Precio unidad** = precio de compra / unidades por caja.
- Ticket de **80 mm** para la impresora del mostrador.
- Contado y crédito, caja del día, tipo de cambio solo para mostrar dólares.

### Lo que cambia para bien

| En Windows | En Elsa SYS |
| --- | --- |
| Programa de escritorio en un solo PC | Navegador. Se puede usar en la red local (también desde el teléfono). |
| Solo se podía vender lo de **despacho** | Se vende la **existencia** (despacho + bodega). El despacho se sigue viendo. |
| Si el precio cambiaba, había que agotar los 11 viejos y después vender los nuevos | Se vende primero despacho al **P1** y, si hace falta, bodega al **P2**, en la misma factura. |
| Marca y “línea” en ventanas aparte | Marca y **categoría** se escriben o se eligen en el mismo campo. |
| Un vencimiento nuevo podía tapar el anterior | Cada ingreso es un **lote**. El viejo se vence primero. |
| Botones o cantidades distintas según el producto | Un solo **Agregar**. Si el frasco tiene 30 (Diamel), se escribe 30 en cantidad. |
| Reportes sueltos o poco claros | Un menú **Reportes** con ventas, facturas (producto + cantidad), inventario, vencidos, CxC y CxP. |
| Nombre Farma Plus | Marca **Elsa SYS**. El nombre de la farmacia se edita en Configuración. |
| Restaurar un `.bak` era un trabajo de SQL Server | En **Configuración** se sube el `.bak` y se reescribe Elsa SYS (con confirmación). |

### Existencia, despacho y bodega (el cambio más importante)

En Windows, con precio nuevo, los 10 recién llegados iban a bodega y en el POS solo se podían vender los 11 de despacho. Para vender 13 había que hacer dos ventas.

En Elsa SYS:

- El POS muestra **Existencia** y **Despacho**.
- Se puede vender 13 de una vez: 11 a P1 y 2 a P2.
- Si despacho y bodega tienen la **misma** cantidad, se cobra el **precio más alto**.
- El precio mayor lleva **borde** para no confundirlo.

P1 se **conserva** en el catálogo cuando P2 cambia. En el MVP web al principio se pisaba P1 con el precio nuevo; eso ya no ocurre.

---

## 2. Frente a la primera versión web (MVP)

Cuando Elsa SYS arrancó, ya se podía entrar, vender de contado, cargar un ingreso simple y ver productos. Esto es lo que se **integró después**.

### Ventas

- Un solo botón **Agregar** (se quitaron Unidad / Caja).
- Cantidad en 1; el cajero escribe 30 si vende el frasco por unidades.
- El buscador de contado es más alto y el encabezado de la tabla **no se mueve** al hacer scroll.
- Se muestran **Existencia**, **Despacho**, **P1** y **P2**.
- El carrito puede partir una venta en despacho y bodega, cada una con su precio.
- Validaciones: cantidad obligatoria, pago obligatorio, el pago cubre el total.
- Tras facturar, el stock del buscador se actualiza sin recargar todo.
- Ticket 80 mm con nombre de farmacia configurable.

### Ingresos

- **Cajas × unid/caja** = unidades a ingresar (Cystone 10 × 100 = 1000).
- **Fecha factura** aparte de **vencimiento**.
- Lotes: la fecha nueva no borra la anterior; se vence primero lo más viejo. Panel de lotes que ya existen.
- **P. venta 1** (anterior, de solo lectura si el producto ya existe) y **P. venta 2** (nuevo).
- Destino **automático**: mismo precio → despacho; precio distinto → bodega.
- Preview de cómo quedan existencia, despacho y bodega.
- Marca y categoría con lista desplegable al escribir.
- En el producto, “Línea” pasó a llamarse **Categoría**.

### Inventario y precios

- **Existencia** = despacho + bodega.
- Al vender se consume **primero despacho**, luego bodega.
- El catálogo guarda P1 (despacho) y P2 (bodega) por separado.
- Borde ámbar en el precio mayor (ingresos, productos, POS y crédito).
- Si ambos depósitos tienen la misma cantidad, se vende al precio más alto.

### Reportes (antes no había este menú)

Al inicio las ventas del día estaban solas y el inventario no era un reporte. Ahora **Reportes** agrupa:

- Ventas del día (como al principio, más existencias mínimas y anular).
- Detalle de ventas (producto, cantidad, ganancia) a Excel.
- Facturas con **producto y cantidad** a Excel.
- Inventario (unidad, cajas, sueltas, despacho, bodega) a Excel.
- Productos vencidos (ventana de 3 meses) a Excel.
- Cuentas por cobrar (se movió aquí; antes era un menú aparte).
- Cuentas por pagar (nuevo, desde las cuentas del sistema viejo).

Paginación en las tablas grandes y **separadores de miles** en los totales.

### Dashboard

- Textos cortos en cada KPI (qué es Ventas, Contado, Crédito, Por cobrar, Productos, Stock bajo).
- Gráficos (ventas/ganancia, 14 días, mezcla de cobro, salud de stock).
- Fechas legibles (`05 - Sep`).
- Top 15 productos más vendidos.
- Lotes vencidos o por vencer al **final** del tablero, mismos 3 meses que el reporte.

### Configuración y datos

- Nombre de farmacia, teléfono, dirección y leyendas del ticket.
- Importar un **`.bak` nuevo** para reescribir la base y probar.
- Exportar backup de Postgres (el sistema nuevo).
- El `.bak` de Windows y el contenedor SQL Server no se borran.

### Interfaz

- Nombre **Elsa SYS**.
- Campos un poco más bajos y más angostos para ver más en una pantalla.
- Uso en celular / otra PC de la red.

---

## 3. Qué no hace (a propósito)

- No formatea ni apaga la PC vieja de Windows.
- No borra el archivo `.bak` original.
- No sustituye SQL Server por Postgres al restaurar: primero se restaura el `.bak` en SQL Server y después se copia a Elsa SYS.
- Las fórmulas de dinero viven en el motor del sistema, no se “inventan” en la pantalla.

---

## 4. Cómo entrenar a alguien que venía de Windows

1. Enseñar el menú de arriba (Contado es el mostrador).
2. En el buscador, señalar **Existencia** vs **Despacho**.
3. En ingresos, mostrar P1 / P2 y el mensaje de “el precio cambió, va a bodega”.
4. Vender un producto con precio distinto y ver las dos líneas (despacho + bodega).
5. Abrir **Reportes** y el **Dashboard**.
6. Dejar el [manual de uso](manual-de-uso.md) a la vista (tiene las mismas pantallas).
