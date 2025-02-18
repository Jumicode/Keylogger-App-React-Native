import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import UdpSocket from 'react-native-udp';
import { NetworkInfo } from 'react-native-network-info';

export default function App() {
  const [isServer, setIsServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [ipAddress, setIpAddress] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ipServer, setIpServer] = useState('');
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    const fetchIpAddress = async () => {
      const ip = await NetworkInfo.getIPV4Address();
      setIpAddress(ip);
    };

    fetchIpAddress();

    if (isServer) {
      // Configura la aplicación como servidor
      const server = UdpSocket.createSocket('udp4');

      server.on('message', (data, rinfo) => {
        setMensaje(data.toString()); // Mostrar el texto completo actualizado
        console.log('Texto recibido:', data.toString());
      });

      server.on('listening', () => {
        console.log('Servidor escuchando en el puerto:', server.address().port);
        setConnectionStatus(`Servidor escuchando en el puerto ${server.address().port}`);
      });

      server.bind(8888);
      setSocket(server);
    } else {
      setConnectionStatus('Servidor desconectado');
      // Configura la aplicación como cliente
      const client = UdpSocket.createSocket('udp4');
      client.bind(8887);
      setSocket(client);
    }

    return () => {
      socket && socket.close();
    };
  }, [isServer]);

  const handleTextChange = (text) => {
    setTypedText(text);

    if (!isServer && socket && ipServer) {
      socket.send(text, undefined, undefined, 8888, ipServer, (error) => {
        if (error) {
          console.log('Error al enviar texto:', error);
        }
      });
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{connectionStatus}</Text>
      
      <Button
        title={isServer ? 'Detener Servidor' : 'Iniciar Servidor'}
        onPress={() => setIsServer(!isServer)}
      />

      {!isServer && (
        <>
          <Text>Ingresa la IP del Servidor:</Text>
          <TextInput 
            onChangeText={setIpServer} 
            value={ipServer} 
            placeholder="Ejemplo: 192.168.1.100"
            style={{ borderWidth: 1, width: 200, marginBottom: 10, padding: 5 }}
          />
          <TextInput
            placeholder="Escribe aquí..."
            value={typedText}
            onChangeText={handleTextChange}
            style={{ borderWidth: 1, width: 200, padding: 5 }}
          />
        </>
      )}

      {isServer && (
        <>
          <Text>IP del Servidor: {ipAddress}</Text>
          <Text>Texto recibido:</Text>
          <Text>{mensaje}</Text>
        </>
      )}
    </View>
  );
}

