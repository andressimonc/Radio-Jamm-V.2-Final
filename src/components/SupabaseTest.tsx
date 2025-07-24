import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Define the SoundFile interface
interface SoundFile {
  name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

interface SoundFile {
  name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

const SupabaseTest = () => {
  const [files, setFiles] = useState<SoundFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envVars, setEnvVars] = useState({
    url: import.meta.env.VITE_SUPABASE_URL || 'Not set',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (hidden for security)' : 'Not set'
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        setLoading(true);
        
        // Test 1: List files in the storage bucket
        const { data: files, error: storageError } = await supabase
          .storage
          .from('metronome-sounds')
          .list();

        if (storageError) throw storageError;
        
        console.log('Supabase connection successful!');
        console.log('Available files:', files);
        
        if (files && files.length > 0) {
          setFiles(files);
        } else {
          setError('No files found in the storage bucket');
        }
        
        // Test 2: Try to fetch from a 'sounds' table if it exists
        try {
          const { data: sounds, error: dbError } = await supabase
            .from('sounds')
            .select('*')
            .limit(5);
            
          if (!dbError && sounds) {
            console.log('Sounds from database:', sounds);
          }
        } catch (e) {
          console.log('No sounds table or error accessing it:', e);
        }
        
      } catch (err) {
        console.error('Supabase test failed:', err);
        setError(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        background: '#f0f0f0',
        borderRadius: '8px',
        margin: '20px 0',
        color: '#333'
      }}>
        Testing Supabase connection...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        background: '#ffebee',
        borderRadius: '8px',
        margin: '20px 0',
        color: '#c62828',
        border: '1px solid #ef9a9a'
      }}>
        <h3>Connection Error</h3>
        <p>{error}</p>
        
        <div style={{ marginTop: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
          <h4>Current Configuration:</h4>
          <pre style={{
            background: '#fff',
            padding: '10px',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '14px'
          }}>
            VITE_SUPABASE_URL = "{envVars.url}"
            VITE_SUPABASE_ANON_KEY = "{envVars.key}"
          </pre>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h4>Next Steps:</h4>
          <ol>
            <li>Verify your Supabase project URL and anon key in the .env file</li>
            <li>Make sure the 'metronome-sounds' bucket exists in your Supabase Storage</li>
            <li>Check that the bucket has proper permissions (should be public for read access)</li>
            <li>Ensure you've uploaded some files to the bucket</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: '#e8f5e9',
      borderRadius: '8px',
      margin: '20px 0',
      color: '#2e7d32',
      border: '1px solid #a5d6a7'
    }}>
      <h3>Supabase Connection Successful! 🎉</h3>
      
      <div style={{ marginTop: '15px' }}>
        <h4>Files in storage bucket:</h4>
        {files.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {files.map((file, index) => (
              <li key={index} style={{ 
                padding: '8px', 
                background: 'rgba(255, 255, 255, 0.7)', 
                margin: '5px 0',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{file.name}</span>
                <span style={{ fontSize: '0.8em', color: '#666' }}>
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No files found in the storage bucket.</p>
        )}
      </div>
    </div>
  );
};

export default SupabaseTest;
