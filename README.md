# smart-things-kickstarter
Kickstarter github

BACKEND
-----------
Om het project te starten:
````
docker compose up -d
````

Als je code hebt aangepast en de veranderingen wilt zien:
````
docker compose up -d --build
````

Checken of de docker containers draaien:
````
docker compose ps
````

Logs bekijken van de API
````
docker compose logs api
````

Live logs bekijken van de API
````
docker compose logs -f api
````

Database logs bekijken:
````
docker compose logs db
````

Containers stoppen:
````
docker compose down
````

Alles stoppen + database leegmaken:
````
docker compose down -v
````

FRONTEND
------------
Zorg dat je in de juiste folder zit:
````
cd frontend/app
````

Run (development):
````
npm run dev
````

Docker:
````
npm run build
````

GEZAMENLIJK
-------------
Eerst:
````
cd frontend/app
npm run build
````

Daarna:
````
docker compose up -d --build
````

Op de VM:
````
git pull
cd frontend/app
npm install
npm run build
cd ../../
docker compose up -d --build
````


VOOR MAC
--------

Colima start:

colima start
npm run dev
