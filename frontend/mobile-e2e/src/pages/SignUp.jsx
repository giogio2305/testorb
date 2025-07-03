import { useNavigate } from 'react-router-dom';
import { registerSchema } from '../schemas/auth';
import useAuthStore from '../store/authStore';
import AuthContainer from '../components/AuthContainer';
import AuthForm from '../components/AuthForm';

function SignUp() {
  const navigate = useNavigate();
  const register = useAuthStore(state => state.register);

  const handleSubmit = async (formData, setErrors) => {
    try {
      const validData = registerSchema.parse(formData);
      const success = await register(validData);
      if (success) {
        navigate('/login');
      }
    } catch (error) {
      if (error.errors) {
        const formattedErrors = {};
        error.errors.forEach(err => {
          formattedErrors[err.path[0]] = err.message;
        });
        setErrors(formattedErrors);
      }
    }
  };

  const fields = [
    {
      name: 'email',
      type: 'email',
      label: 'Work Email'
    },
    {
      name: 'username',
      type: 'text',
      label: 'Username'
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password'
    }
  ];

  return (
    <AuthContainer>
      <AuthForm
        title="The All-in-One E2E Mobile Testing Lab"
        subtitle="Run visual tests directly in your browser on live emulators with TestOrb."
        fields={fields}
        submitText="Create account"
        onSubmit={handleSubmit}
        footerText="Already have an account?"
        footerLinkText="Sign in"
        footerLink="/login"
      />
    </AuthContainer>
  );
}

export default SignUp;