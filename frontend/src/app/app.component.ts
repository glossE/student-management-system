import { Component } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { StudentListComponent } from './components/student-list/student-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ToastModule, StudentListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly year = new Date().getFullYear();
}
