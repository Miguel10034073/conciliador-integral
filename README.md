# Conciliador integral

Página web local que une en una sola pantalla la lectura de facturas electrónicas (XML) y la conciliación contable: **XML vs DIAN, eventos por acusar, compras y ventas DIAN vs SCI, bancos y conciliación bancaria**.

No necesita internet ni instalar nada: se abre con doble clic en `index.html` en Chrome o Edge. Los archivos se procesan en el computador; no se envían a ningún lado.

## Organización

```
002. Conciliador integral Web\
    Conciliador integral\        ← este repositorio: la página y lo que necesita para usarse
        index.html
        estilos.css
        js\
        README.md
        .gitignore
    Copias de seguridad\         ← copias de la configuración. NO va al repositorio
```

## Cómo usarlo cada mes

1. En la carpeta de la empresa del mes:
   - `01. Causaciones` → los XML de las facturas recibidas (en cualquier subcarpeta; también `.zip`).
   - `06. Reportes sistema de contabilizacion (SCI)` → Dian, Digitacion, Eventos, Mov bancolombia, Mov davivienda, SCI Bancolombia, SCI Davivienda, Tabla de impuestos y Tabla de codificacion.
2. Clic en **Seleccionar carpeta** y elija la carpeta de la empresa (ej. «01. Inversiones Mindala SAS»), la del mes o la del año: la página encuentra cada empresa y mes y los ofrece en el selector de arriba. Chrome pregunta si permite «ver» los archivos: es solo el permiso para leerlos en el navegador.
   - Dentro de cada empresa la página solo entra a `01. Causaciones` y `06. Reportes…`: no recorre Egresos, Nómina, etc. Así evita el error de Windows con rutas de más de 260 caracteres.
   - También puede arrastrar la carpeta a la página.
3. Revise el **Resumen** y entre al detalle. **Exportar a Excel** descarga todos los resultados en un archivo `.xlsx`.

## Pantallas

La barra azul de arriba tiene el selector de empresa y mes, **Seleccionar carpeta**, **Exportar a Excel**, **Deshacer / Rehacer** y el estado de la copia de seguridad. Debajo está el menú con cada sección y, al lado, cuántas cosas tiene pendientes (✓ si está al día).

| Pestaña | Qué muestra |
|---|---|
| Resumen | Indicadores de cada cruce; clic en uno para ver el detalle. |
| XML vs DIAN | Cada XML de `01. Causaciones` debe estar en el reporte DIAN y cada documento recibido del mes debe tener su XML. Alertas: «Falta XML», «XML no está en DIAN» (con el motivo), «Diferencia de valor», «XML duplicado». Muestra si está contabilizado en SCI. |
| Eventos por acusar | Facturas a crédito que no aparecen en el reporte de Eventos. «Evento incompleto» = falta recepción de factura, de mercancía o aceptación. |
| Compras / Ventas | DIAN vs SCI. |
| Facturas XML | Lista de facturas con descuentos, impuestos y retenciones, detalle de productos y la ficha completa de cada factura (clic en la fila). |
| Tabla de codificación | Conceptos de SCI por tipo de transacción con cuenta bruto, IVA, retención y total. |
| Bancos, Conciliación bancaria, Gastos bancarios | Extracto vs libros, modelo de conciliación con el saldo del extracto digitado, y gastos por causar. |
| Control de carga | Qué archivos se leyeron, con qué fechas y si hay algo por corregir. |
| Configuración | Parámetros, partidas de meses anteriores, tipos de documento, conceptos bancarios y copias de seguridad. |

## Configuración, copias de seguridad y Deshacer

La configuración (tipos de documento, conceptos bancarios, parámetros, saldos de extracto y partidas de meses anteriores) se guarda en el navegador y, además:

- **Copia automática**: la primera vez, clic en **Sin carpeta de copias** (arriba a la derecha) o en **Configuración › Copias de seguridad › Elegir carpeta de copias**, y elija `002. Conciliador integral Web\Copias de seguridad`. Desde entonces, un instante después de cada cambio, se escribe la copia del día `Configuración conciliador AAAA-MM-DD.json`. Se conservan las 7 más recientes. La barra azul muestra «Copia al día» con la hora.
- **Navegador o computador nuevo**: elija la misma carpeta de copias y la configuración más reciente se carga sola.
- **Volver a una copia anterior**: Configuración › **Importar configuración** y elija el archivo en la carpeta de copias. También sirve **Exportar configuración** para guardar una copia a mano.
- **Deshacer / Rehacer**: los botones de la barra azul (o Ctrl+Z y Ctrl+Y; en Mac ⌘Z y ⌘Y) vuelven atrás o adelante cualquier cambio de la configuración: saldos de extracto, partidas, tipos, conceptos y parámetros. Al pasar el mouse dicen qué cambio deshacen. Se guardan los últimos 40 cambios, también si se cierra la pestaña.
- Si se cierra la pestaña con un cambio sin copiar, el navegador avisa y la copia se escribe enseguida.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página. |
| `estilos.css` | Apariencia (mismo diseño que «Expediente laboral»). |
| `js/archivos.js` | Lectura y escritura de Excel, CSV y ZIP (sin librerías externas). |
| `js/utilidades.js` | Números, fechas, NIT y números de documento. |
| `js/config.js` | Configuración por defecto y guardado en el navegador. |
| `js/respaldo.js` | Copias de seguridad automáticas y Deshacer / Rehacer. |
| `js/xml.js` | Lector de facturas electrónicas XML (UBL 2.1 / AttachedDocument). |
| `js/lectores.js` | Detección de carpetas y un lector por cada reporte. |
| `js/motor.js` | Cruces XML-DIAN, eventos, DIAN-SCI y conciliación bancaria. |
| `js/componentes.js` | Tablas, filtros y editores. |
| `js/app.js` | Pantallas y exportación. |

## Privacidad

La página no envía nada a internet. Las copias de la configuración traen saldos de extracto y partidas bancarias: se guardan en `Copias de seguridad`, fuera de este repositorio, y el `.gitignore` impide subir archivos `.json` o de Excel por si acaso.
