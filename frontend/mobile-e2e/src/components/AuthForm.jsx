import { useState } from 'react';
import { Link } from 'react-router-dom';

function AuthForm({ 
  title, 
  subtitle, 
  fields, 
  submitText, 
  onSubmit, 
  footerText, 
  footerLinkText, 
  footerLink 
}) {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit(formData, setErrors);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <div className="block mx-auto">
      <h1 className="text-center text-3xl font-bold text-zinc-700 leading-normal">{title}</h1>
      {subtitle && <h5 className="text-center text-md font-medium text-zinc-500 leading-tight my-4">{subtitle}</h5>}

      <div className="flex flex-col w-[380px] min-h-56 bg-base-100 mt-12 mb-8 mx-auto rounded-md shadow py-2">
        <form onSubmit={handleSubmit} className="w-full px-6">
          {fields.map((field) => (
            <fieldset key={field.name} className="fieldset my-2">
              <div className="flex w-full items-center justify-between px-1">
                <legend className="fieldset-legend my-2 font-semibold text-sm text-zinc-600">{field.label}</legend>
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="fieldset-legend my-2 font-semibold text-xs text-zinc-500 cursor-pointer hover:text-zinc-700"
                  >
                    {showPassword[field.name] ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              <input
                type={field.type === 'password' ? (showPassword[field.name] ? 'text' : 'password') : field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                className="w-full max-w-xl border-2 border-gray-200 p-1 rounded-md my-0.5 focus:outline-none text-md"
              />
              {errors[field.name] && (
                <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
              )}
            </fieldset>
          ))}
          <button type="submit" className="btn bg-emerald-500 text-white w-full max-w-xl my-4">
            {submitText}
          </button>
        </form>
      </div>
      {footerText && (
        <div className="mx-auto text-center text-sm text-zinc-700">
          {footerText} <Link to={footerLink} className="font-medium text-blue-600">{footerLinkText}</Link>
        </div>
      )}
    </div>
  );
}

export default AuthForm;