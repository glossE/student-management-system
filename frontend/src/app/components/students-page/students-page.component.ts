import { Component } from '@angular/core';
import { StudentListComponent } from '../student-list/student-list.component';

@Component({
  selector: 'app-students-page',
  standalone: true,
  imports: [StudentListComponent],
  template: '<app-student-list />',
})
export class StudentsPageComponent {}
