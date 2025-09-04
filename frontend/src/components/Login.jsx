import { useState } from 'react';
import axios from 'axios';

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/auth/${isRegister ? 'register' : 'login'}`, { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border p-2" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="border p-2" />
      <button type="submit" className="bg-blue-500 text-white p-2">{isRegister ? 'Register' : 'Login'}</button>
      <button onClick={() => setIsRegister(!isRegister)}>{isRegister ? 'Switch to Login' : 'Switch to Register'}</button>
    </form>
  );
};

export default Login;