import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap, catchError, throwError } from 'rxjs';
import { User, UserLogin } from './user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private usersSubject= new BehaviorSubject<User[]>([]);
  users$= this.usersSubject.asObservable();
  private _http=inject(HttpClient);
  

  private userUrl= `${environment.apiUrl}/users`;

  loadUsers(){
    this._http.get<User[]>(this.userUrl).subscribe((users)=>{
      const newUsers = users.map(user => ({ ...user }));
      this.usersSubject.next(users);});  
  }
 

  getUsers():Observable<User[]>{
  return this.users$
  }

  getUserbyId(id: string): Observable<User> {
    return this._http.get<User>(`${this.userUrl}/${id}`);
  }

  createUser(user: User): Observable<User> {
    return this._http.post<User>(this.userUrl, user).pipe(
      tap(() =>{
        this.loadUsers();

        })
    );
  }

  updateUser(id_users: string, user: User): Observable<User> {
    return this._http.put<User>(`${this.userUrl}/${id_users}`, user).pipe(
      tap(() =>{
        this.loadUsers();
      })
    );

  } 

  deleteUser(id: string): Observable<User> {
    return this._http.delete<User>(`${this.userUrl}/${id}`).pipe(
      tap(() =>{
        this.loadUsers();
      })
    );
  }

  login(username: string, password: string): Observable<UserLogin> {
  // Temporal: enviar `name` (campo real en el modelo) para evitar el error SQL
  // También enviamos `correo` por compatibilidad con otros endpoints.
  const loginData: any = { name: username, password, correo: username };

  return this._http.post<UserLogin>(`${environment.apiUrl}/auth/login`, loginData).pipe(
    tap(response => {
      localStorage.setItem('token', response.token);
      localStorage.setItem('idUser', response.idUser);
      localStorage.setItem('rol', response.rol);
    }),
    // Mejor logging para errores: exponemos status y body en la consola para debugging
    // El componente que llama puede manejar el error y mostrar mensajes al usuario.
    // Re-lanzamos el error para que el subscriber lo reciba.
    // Nota: no transformamos la estructura de error.
    catchError((err) => {
      console.error('[UsersService] login error:', {
        url: `${environment.apiUrl}/auth/login`,
        payload: loginData,
        status: err?.status,
        error: err?.error || err
      });
      return throwError(() => err);
    })
  );
}


}
