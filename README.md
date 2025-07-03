
# 🧪 Projet : Plateforme Web de Test End-to-End Mobile avec Appium

## 🎯 Objectif :
Créer une application web complète permettant aux utilisateurs de :
- Uploader une application mobile à tester (fichier APK ou IPA)
- Uploader ou écrire un script de test Appium (JavaScript)
- Lancer les tests sur un émulateur Android visible via navigateur (NoVNC intégré)
- Suivre l'exécution en temps réel
- Recevoir un rapport de test (succès, logs, erreurs)
- Bénéficier d'une assistance IA (Gemini Flash) pour générer ou corriger les scripts de test

---

## 🧱 Stack technique :

### Backend
- Node.js + Express (API REST)
- BullMQ (gestion de la file de tests)
- Redis (stockage des jobs)
- Dockerode (contrôle des conteneurs d’émulateur)
- Appium (serveur de test E2E)
- Multer + Formidable (upload de fichiers)

### Frontend
- React 18
- Vite (build ultra-rapide)
- Axios (requêtes API)
- Interface minimaliste (upload, état des tests, affichage noVNC)

### Conteneur émulateur
- Image Docker `budtmo/docker-android-x86-11.0`
    - Android Emulator
    - Appium
    - VNC/noVNC intégrés
    - Ports exposés : `6080` (web), `4723` (Appium), `5554` (ADB)

---

## ⚙️ Fonctionnement technique :

1. L'utilisateur upload son app et son script de test Appium
2. Un job est envoyé dans une file Redis (BullMQ)
3. Un `testWorker` récupère le job, démarre un conteneur Android avec Appium
4. Le test est exécuté dans le conteneur, les résultats sont capturés
5. L'utilisateur peut voir l’émulateur via un viewer VNC (dans son navigateur)
6. À la fin, un rapport de test est affiché

---

## 💡 Suggestions de commandes à donner à l'IA Cursor :

- "Ajoute un formulaire React pour uploader APK et script"
- "Crée un endpoint Express pour stocker les fichiers reçus"
- "Ajoute un worker BullMQ qui lance un test Appium dans le conteneur"
- "Intègre l'affichage NoVNC dans la page React"
- "Permets à l'IA de générer un script Appium à partir d'une description"

---

## 📁 Structure actuelle
```
mobile-e2e-platform/
├── backend/
│   ├── api/
│   ├── worker/
│   ├── orchestrator/
│   └── queue/
├── frontend/
│   ├── src/
│   ├── public/
│   └── vite.config.js
├── scripts/
├── docker-compose.yml
└── PROJECT_OVERVIEW.md
```
