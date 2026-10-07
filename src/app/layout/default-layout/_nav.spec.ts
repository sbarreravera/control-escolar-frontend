import { buildNavItems } from './_nav';

describe('buildNavItems', () => {
  it('shows the full school administration to ADMIN users', () => {
    const items = buildNavItems('ADMIN');

    expect(
      items.some(
        item => item.name === 'Registrar entrada/salida'
      )
    ).toBe(true);

    expect(
      items.some(
        item => item.name === 'Avisos y comunicaciones'
      )
    ).toBe(true);

    const students = items.find(
      item => item.name === 'Alumnos'
    );

    expect(
      students?.children?.map(item => item.name)
    ).toEqual([
      'Listado de alumnos',
      'Carga masiva',
      'Credenciales QR'
    ]);

    const guardians = items.find(
      item => item.name === 'Tutores'
    );

    expect(
      guardians?.children?.map(item => item.name)
    ).toEqual([
      'Listado de tutores',
      'Carga masiva',
      'Accesos al portal',
      'Autoregistro'
    ]);

    const administration = items.find(
      item => item.name === 'Administración escolar'
    );

    expect(
      administration?.children?.map(item => item.name)
    ).toEqual([
      'Ciclos escolares',
      'Grados y grupos',
      'Usuarios del sistema'
    ]);
  });

  it('shows only assigned modules to OPERATOR users', () => {
    const items = buildNavItems(
      'OPERATOR',
      true,
      [
        'ACCESS_SCANNER',
        'CREDENTIALS'
      ]
    );

    expect(
      items.some(
        item => item.name === 'Registrar entrada/salida'
      )
    ).toBe(true);

    expect(
      items.some(
        item => item.name === 'Avisos y comunicaciones'
      )
    ).toBe(false);

    const students = items.find(
      item => item.name === 'Alumnos'
    );

    expect(
      students?.children?.map(item => item.name)
    ).toEqual([
      'Credenciales QR'
    ]);

    expect(
      items.some(
        item => item.name === 'Tutores'
      )
    ).toBe(false);

    expect(
      items.some(
        item => item.name === 'Administración escolar'
      )
    ).toBe(false);
  });

  it('can render additional operator school modules independently', () => {
    const items = buildNavItems(
      'OPERATOR',
      true,
      [
        'DASHBOARD',
        'STUDENTS',
        'GUARDIANS',
        'GUARDIAN_ACCESS',
        'GUARDIAN_REGISTRATION',
        'COMMUNICATIONS',
        'ACADEMIC_STRUCTURE'
      ]
    );

    expect(
      items.some(item => item.name === 'Inicio')
    ).toBe(true);

    expect(
      items.some(
        item => item.name === 'Avisos y comunicaciones'
      )
    ).toBe(true);

    const guardians = items.find(
      item => item.name === 'Tutores'
    );

    expect(
      guardians?.children?.map(item => item.name)
    ).toEqual([
      'Listado de tutores',
      'Carga masiva',
      'Accesos al portal',
      'Autoregistro'
    ]);

    const administration = items.find(
      item => item.name === 'Administración escolar'
    );

    expect(
      administration?.children?.map(item => item.name)
    ).toEqual([
      'Ciclos escolares',
      'Grados y grupos'
    ]);
  });

  it('keeps SUPER_ADMIN focused on schools without context', () => {
    const items = buildNavItems('SUPER_ADMIN');

    expect(
      items.map(item => item.name)
    ).toEqual([
      'Inicio',
      'Administración',
      'Escuelas'
    ]);
  });

  it('shows complete school administration to SUPER_ADMIN with context', () => {
    const items = buildNavItems(
      'SUPER_ADMIN',
      true
    );

    expect(
      items.some(
        item => item.name === 'Cambiar escuela'
      )
    ).toBe(true);

    expect(
      items.some(
        item => item.name === 'Registrar entrada/salida'
      )
    ).toBe(true);

    const administration = items.find(
      item => item.name === 'Administración escolar'
    );

    expect(
      administration?.children?.map(item => item.name)
    ).toEqual([
      'Ciclos escolares',
      'Grados y grupos',
      'Usuarios del sistema'
    ]);
  });
});
