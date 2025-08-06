import { useNavigate } from 'react-router-dom';
import { registerSchema } from '../schemas/auth';
import useAuthStore from '../store/authStore';
import AuthContainer from '../components/AuthContainer';
import AuthForm from '../components/AuthForm';
import toast from 'react-hot-toast';
import { useState } from 'react';

function SignUp() {
  const navigate = useNavigate();
  const register = useAuthStore(state => state.register);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData, setErrors) => {
    setIsLoading(true);
    try {
      const validData = registerSchema.parse(formData);
      const success = await register(validData);
      
      if (success) {
        // Afficher une notification de succès avec un CTA
        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <div className="font-semibold text-green-800">
                🎉 Inscription réussie !
              </div>
              <div className="text-sm text-gray-600">
                Votre compte a été créé avec succès.
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/login');
                }}
                className="mt-2 px-4 py-2 bg-emerald-500 text-white rounded-md text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                Se connecter maintenant →
              </button>
            </div>
          ),
          {
            duration: 6000,
            style: {
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '400px'
            }
          }
        );
      }
    } catch (error) {
      if (error.errors) {
        // Erreurs de validation du schéma
        const formattedErrors = {};
        error.errors.forEach(err => {
          formattedErrors[err.path[0]] = err.message;
        });
        setErrors(formattedErrors);
        
        // Afficher une notification d'erreur de validation
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-red-800">
              ❌ Erreurs de validation
            </div>
            <div className="text-sm text-gray-600">
              Veuillez corriger les erreurs dans le formulaire.
            </div>
          </div>,
          {
            duration: 4000,
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '12px',
              borderRadius: '8px'
            }
          }
        );
      } else {
        // Erreur du serveur (depuis authStore)
        const errorStore = useAuthStore.getState().error;
        let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
        let errorDetails = '';
        
        if (errorStore) {
          if (errorStore.includes('User already exists')) {
            errorMessage = 'Compte déjà existant';
            errorDetails = 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà.';
          } else if (errorStore.includes('Error creating user')) {
            errorMessage = 'Erreur serveur';
            errorDetails = 'Impossible de créer le compte. Veuillez réessayer.';
          } else {
            errorDetails = errorStore;
          }
        }
        
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-red-800">
              ❌ {errorMessage}
            </div>
            <div className="text-sm text-gray-600">
              {errorDetails}
            </div>
          </div>,
          {
            duration: 5000,
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '12px',
              borderRadius: '8px',
              maxWidth: '400px'
            }
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    {
      name: 'email',
      type: 'email',
      label: 'Email professionnel'
    },
    {
      name: 'username',
      type: 'text',
      label: 'Nom d\'utilisateur'
    },
    {
      name: 'password',
      type: 'password',
      label: 'Mot de passe'
    }
  ];

  return (
    <AuthContainer>
      <AuthForm
        title="Plateforme de Test E2E Mobile Tout-en-Un"
        subtitle="Exécutez des tests visuels directement dans votre navigateur sur des émulateurs en direct avec TestOrb."
        fields={fields}
        submitText={isLoading ? "Création du compte..." : "Créer un compte"}
        onSubmit={handleSubmit}
        footerText="Vous avez déjà un compte ?"
        footerLinkText="Se connecter"
        footerLink="/login"
      />
    </AuthContainer>
  );
}

export default SignUp;