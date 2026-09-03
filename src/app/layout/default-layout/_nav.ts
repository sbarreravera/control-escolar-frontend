import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Inicio',
    url: '/dashboard',
    iconComponent: {
      name: 'cil-speedometer'
    }
  },
  {
    title: true,
    name: 'Administración'
  },
  {
    name: 'Escuelas',
    url: '/schools',
    iconComponent: {
      name: 'cil-home'
    }
  }
];