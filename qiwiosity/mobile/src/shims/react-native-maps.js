import React from 'react';
import { View } from 'react-native';

function MapView({ children, style, ...props }) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#e8e4dc' }, style]}>
      {children}
    </View>
  );
}

function Marker() {
  return null;
}

function Polyline() {
  return null;
}

function Callout({ children }) {
  return children || null;
}

MapView.Marker = Marker;
MapView.Polyline = Polyline;
MapView.Callout = Callout;

export default MapView;
export { Marker, Polyline, Callout };
