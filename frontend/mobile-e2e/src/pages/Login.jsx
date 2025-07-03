import { useNavigate } from 'react-router-dom';
import { loginSchema } from '../schemas/auth';
import useAuthStore from '../store/authStore';
import AuthContainer from '../components/AuthContainer';
import AuthForm from '../components/AuthForm';

function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (formData, setErrors) => {
    try {
      const validData = loginSchema.parse(formData);
      await login(validData);
      navigate('/');
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
      label: 'Email'
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
        title="Login to TestOrb"
        fields={fields}
        submitText="Login"
        onSubmit={handleSubmit}
        footerText="Don't have an account?"
        footerLinkText="Sign up"
        footerLink="/signup"
      />
    </AuthContainer>
  );
}

export default Login;