import { buildNavItems } from './_nav';

describe('buildNavItems', () => {
  it('groups admin navigation by operation, students, guardians and school administration', () => {
    const items = buildNavItems('ADMIN');

    expect(items.some((item) => item.name === 'Registrar entrada/salida')).toBe(true);
    expect(items.some((item) => item.name === 'Avisos y comunicaciones')).toBe(true);

    const students = items.find((item) => item.name === 'Alumnos');
    expect(students?.children?.map((item) => item.name)).toEqual([
      'Listado de alumnos',
      'Carga masiva',
      'Credenciales QR'
    ]);

    const guardians = items.find((item) => item.name === 'Tutores');
    expect(guardians?.children?.map((item) => item.name)).toEqual([
      'Listado de tutores',
      'Carga masiva',
      'Accesos al portal'
    ]);

    const administration = items.find(
      (item) => item.name === 'Administración escolar'
    );
    expect(administration?.children?.map((item) => item.name)).toEqual([
      'Ciclos escolares',
      'Grados y grupos'
    ]);
  });

  it('preserves operator permissions while using the grouped navigation', () => {
    const items = buildNavItems('OPERATOR');

    expect(items.some((item) => item.name === 'Avisos y comunicaciones')).toBe(false);
    expect(items.some((item) => item.name === 'Administración escolar')).toBe(false);

    const students = items.find((item) => item.name === 'Alumnos');
    expect(students?.children?.map((item) => item.name)).toEqual([
      'Listado de alumnos',
      'Credenciales QR'
    ]);

    const guardians = items.find((item) => item.name === 'Tutores');
    expect(guardians?.children?.map((item) => item.name)).toEqual([
      'Listado de tutores'
    ]);
  });

  it('keeps the super admin navigation focused on schools', () => {
    const items = buildNavItems('SUPER_ADMIN');

    expect(items.map((item) => item.name)).toEqual([
      'Inicio',
      'Administración',
      'Escuelas'
    ]);
  });
});
