import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const DocList = () => {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await axios.get('/api/docs', { headers: { 'x-auth-token': localStorage.getItem('token') } });
        setDocs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="p-4">
      <h1>Documents</h1>
      <ul>
        {docs.map(doc => (
          <li key={doc._id}><Link to={`/doc/${doc._id}`}>{doc.title}</Link></li>
        ))}
      </ul>
      {/* Add create button */}
    </div>
  );
};

export default DocList;