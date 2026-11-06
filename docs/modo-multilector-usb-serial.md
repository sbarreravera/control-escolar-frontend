# Control Escolar — modo multilector USB-COM

## Alcance

Pantalla: **Registrar entrada/salida → Abrir modo multilector**

Ruta Angular: `/#/access-scanner/multi`. Requiere inicio de sesión
con permiso `ACCESS_SCANNER` y una escuela seleccionada.
Se conserva la ruta y el funcionamiento del escáner existente.

No requiere cambios en Spring Boot ni regenerar credenciales QR:
cada movimiento utiliza el endpoint productivo
`POST /api/v1/access-events/scan`, con `captureMethod=QR_USB`
y `deviceName` igual al nombre asignado al lector.

## Preparación de los JOWVDY X7-1000

1. Configura cada lector con el código de programación **USB-COM** de su manual,
   **sin restablecimiento de fábrica**.
2. Activa la terminación **CR+LF** (o CR/LF) en el manual. Sin delimitador no
   se puede saber cuándo acaba cada código ni evitar concatenaciones.
3. Conecta los lectores al PC Windows (con hub alimentado si lo necesitas).
4. Cierra Web Serial Terminal u otros programas que tengan abiertos COM6/COM7.
5. Abre Control Escolar en Chrome o Edge compatible desde HTTPS.
6. Selecciona la escuela. Ingresa al modo multilector.
7. Escribe nombre y función para cada lector (por ejemplo,
   «Entrada principal» / Entrada y «Salida principal» / Salida).
8. Haz clic en **Agregar lector USB-COM** y elige el puerto correcto en la
   ventana del navegador. Cada clic autoriza un dispositivo.
9. Comprueba que ambos lectores estén conectados antes de iniciar sesión.
10. Haz clic en **Iniciar modo multilector**.

La aplicación abre cada puerto a **9600 baudios, 8 bits, sin paridad y 1 stop**.
Los números COM son administrados por el sistema operativo; Web Serial no
garantiza exponer el número COM en JavaScript. Comprueba físicamente qué
puerto corresponde a cada lector; una asignación incorrecta invierte
entradas/salidas.

## Gestión segura de lecturas

- Cada puerto tiene un lector de flujo y un búfer CR/LF propios.
- La cola procesa los POST uno por uno (FIFO) sin impedir que otros lectores
  continúen recibiendo sus escaneos.
- Un QR/operación repetido mientras está pendiente o durante los 5 segundos
  siguientes al registro correcto se ignora. Entrada y salida son movimientos
  diferentes.
- La cola tiene un máximo de 100 lecturas pendientes. Si se llena, un mensaje
  señala explícitamente que la última lectura NO fue registrada.
- Una falla de red o autorización pausa los envíos pendientes. El POST fallido
  **no se reintenta automáticamente**, pues pudo haberse registrado antes
  de perderse su respuesta. Revisar **Monitor de accesos** antes de
  repetir cualquier lectura.
- Reanudar o descartar pendientes requiere una acción explícita. Descartar
  implica que esos movimientos no se procesarán y exige confirmación.
- Los resultados recientes muestran lector, tipo de movimiento, alumno
  y notificaciones encoladas; **no se muestran tokens QR**.
- El modo seguro bloquea otras rutas hasta autenticar nuevamente la
  contraseña y terminar de procesar pendientes.

## Reconexión

- Si un lector se desconecta, aparecerá su estado «Desconectado».
- No se asignan automáticamente los dispositivos tras una recarga del
  navegador porque dos JOWVDY idénticos podrían intercambiar de COM,
  ocasionando entradas y salidas equivocadas.
- Desbloquea, desconecta los puertos, conecta los lectores de nuevo y
  verifica las funciones antes de empezar otra sesión.
- Evita recargar o cerrar la pestaña mientras hay solicitudes pendientes.

## Prueba manual obligatoria antes de producción

- Validar dos lectores físicos USB-COM simultáneos (COM6 y COM7).
- Confirmar que las lecturas llegan separadas incluso con QR simultáneos.
- Verificar Entrada desde lector 1 y Salida desde lector 2 en Monitor de accesos.
- Confirmar una sola notificación por movimiento registrado.
- Repetir QR para comprobar deduplicación; probar QR inválido/inactivo.
- Desconectar y reconectar físicamente un lector.
- Simular pérdida de red y revisar pausa, cola y recuperación.
- Revisar bloqueo y desbloqueo por contraseña.
- Validar que el escáner anterior USB-HID y cámara no cambia.

**Compatibilidad:** Web Serial requiere HTTPS y navegadores compatibles.
La prueba de hardware confirmada fue en Windows. No asumir Android/iPad
hasta probar cada dispositivo y navegador real.
