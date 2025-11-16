'use client';

import { useAuth } from '@/hooks/useAuth';
import { Building, User, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface StationInfo {
  _id: string;
  name: string;
  location: string;
  isActive: boolean;
}

interface UserStationInfoProps {
  showCard?: boolean;
  showInHeader?: boolean;
  className?: string;
}

export default function UserStationInfo({ 
  showCard = true, 
  showInHeader = false, 
  className = "" 
}: UserStationInfoProps) {
  const { user, refreshUserData } = useAuth();
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStationInfo() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        
        if (user?.role === 'manager') {
          // For managers, use the my-station API to find their assigned station
          const stationRes = await fetch('/api/stations/my-station', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (stationRes.ok) {
            const stationData = await stationRes.json();
            if (stationData.success && stationData.station) {
              setStationInfo(stationData.station);
            }
          }
        } else if (user?.stationId || (user?.managedStations && user.managedStations.length > 0)) {
          // For admins/superadmins, use the existing logic
          const stationId = user.stationId || user.managedStations?.[0];
          
          if (stationId && token) {
            const stationRes = await fetch(`/api/stations/${stationId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (stationRes.ok) {
              const stationData = await stationRes.json();
              setStationInfo(stationData.station);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching station info:', error);
      }
      
      setLoading(false);
    }

    fetchStationInfo();
  }, [user]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // For managers without station, show nothing
  if (user.role === 'manager' && !stationInfo) {
    return null;
  }

  const userDisplay = (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-gray-900">{user.name}</span>
      <span className="text-sm text-gray-500 capitalize">({user.role})</span>
    </div>
  );

  const stationDisplay = stationInfo ? (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-primary" />
      <span className="font-medium text-primary">{stationInfo.name}</span>
      <span className="text-sm text-gray-500">{stationInfo.location}</span>
      <Badge 
        variant="outline" 
        className={`text-xs ${stationInfo.isActive ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}`}
      >
        {stationInfo.isActive ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  ) : user.role === 'superadmin' ? (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-600">Full system access</span>
    </div>
  ) : null;

  if (showInHeader) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <User className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-gray-900 text-sm">{user.name}</span>
          <span className="text-xs text-gray-500 capitalize">({user.role})</span>
        </div>
        {stationInfo && (
          <div className="flex items-center gap-1">
            <Building className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary text-sm">{stationInfo.name}</span>
          </div>
        )}
      </div>
    );
  }

  if (!showCard) {
    return (
      <div className={`space-y-2 ${className}`}>
        {userDisplay}
        {stationDisplay}
      </div>
    );
  }

  return (
    <Card className={`luxury-card bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">{user.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{user.role}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              {user.role === 'manager' ? 'Station Manager' : 
               user.role === 'admin' ? 'Station Admin' : 
               user.role === 'superadmin' ? 'Super Admin' : 'User'}
            </Badge>
          </div>

          {/* Station Info */}
          {stationInfo ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <Building className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">{stationInfo.name}</h3>
                  <p className="text-sm text-gray-600">{stationInfo.location}</p>
                  <p className="text-xs text-gray-500">
                    Station ID: {stationInfo._id?.slice(-8) || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${stationInfo.isActive ? 'text-green-600 border-green-300 bg-green-50' : 'text-red-600 border-red-300 bg-red-50'}`}
                >
                  {stationInfo.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ) : user.role === 'superadmin' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-100">
                <Building className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Full System Access</h3>
                <p className="text-sm text-gray-600">Manage all stations and business operations</p>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
