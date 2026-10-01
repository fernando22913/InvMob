import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRouterOutlet,
  IonToolbar,
  MenuController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  bagHandleOutline,
  businessOutline,
  cartOutline,
  chevronBackOutline,
  chevronForwardOutline,
  createOutline,
  cubeOutline,
  eyeOffOutline,
  eyeOutline,
  fileTrayFullOutline,
  folderOutline,
  gridOutline,
  homeOutline,
  keyOutline,
  lockClosedOutline,
  logOutOutline,
  optionsOutline,
  peopleOutline,
  personCircleOutline,
  personOutline,
  resizeOutline,
  shieldCheckmarkOutline,
  swapVerticalOutline,
  trashOutline,
} from 'ionicons/icons';

import { AuthService } from './core/auth.service';

interface NavItem {
  label: string;
  url: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    AsyncPipe,
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonFooter,
    IonButton,
  ],
})
export class AppComponent {
  readonly navGroups: NavGroup[] = [
    {
      label: 'Operación',
      items: [
        { label: 'Panel', url: '/dashboard', icon: 'grid-outline' },
        { label: 'Productos', url: '/products', icon: 'cube-outline' },
        { label: 'Ventas', url: '/sales', icon: 'cart-outline' },
        { label: 'Inventario', url: '/inventory', icon: 'file-tray-full-outline' },
        { label: 'Compras', url: '/purchases', icon: 'bag-handle-outline' },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { label: 'Categorías', url: '/categories', icon: 'folder-outline' },
        { label: 'Unidades', url: '/units', icon: 'resize-outline' },
      ],
    },
    {
      label: 'Contactos',
      items: [
        { label: 'Clientes', url: '/customers', icon: 'people-outline' },
        { label: 'Proveedores', url: '/suppliers', icon: 'business-outline' },
      ],
    },
    {
      label: 'Administración',
      items: [
        { label: 'Bodegas', url: '/warehouses', icon: 'home-outline' },
        { label: 'Usuarios', url: '/users', icon: 'person-circle-outline' },
        { label: 'Roles', url: '/roles', icon: 'shield-checkmark-outline' },
      ],
    },
  ];

  constructor(
    public readonly auth: AuthService,
    private readonly menu: MenuController,
    private readonly router: Router
  ) {
    addIcons({
      addOutline,
      alertCircleOutline,
      bagHandleOutline,
      businessOutline,
      cartOutline,
      chevronBackOutline,
      chevronForwardOutline,
      createOutline,
      cubeOutline,
      eyeOffOutline,
      eyeOutline,
      fileTrayFullOutline,
      folderOutline,
      gridOutline,
      homeOutline,
      keyOutline,
      lockClosedOutline,
      logOutOutline,
      optionsOutline,
      peopleOutline,
      personCircleOutline,
      personOutline,
      resizeOutline,
      shieldCheckmarkOutline,
      swapVerticalOutline,
      trashOutline,
    });
  }

  closeMenu(): void {
    void this.menu.close();
  }

  logout(): void {
    this.auth.logout();
    void this.menu.close();
    void this.router.navigateByUrl('/login');
  }
}
