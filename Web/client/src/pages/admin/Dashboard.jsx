import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ShoppingBag, ArrowRightLeft, Users2, User2, Trash2, UserCheck, UserMinus } from 'lucide-react';
import { ActionMenu } from "@/components/admin/ActionMenu";
import { DeleteDialog, ActivateDialog, DeactivateDialog } from "@/components/admin/ActionDialogs";
import adminApi from '@/api/adminApi';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

// Utility functions
const formatDate = (timestamp) => {
  if (!timestamp) return '--';
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '--';
  }
};

export default function AdminDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState({
    activeUsers: 0,
    totalOrders: 0,
    totalTransfers: 0,
    totalVisitors: 0,
    userGrowth: 0,
    orderGrowth: 0,
    transferGrowth: 0,
    visitorGrowth: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [users, setUsers] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const LoadingCard = () => (
    <Card className="p-6 bg-white">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-20"></div>
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    </Card>
  );

  const LoadingTable = () => (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
      <div className="animate-pulse">
        <div className="border-b">
          <div className="flex p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 px-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
            <div className="w-20"></div>
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex p-4 border-b">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="flex-1 px-3">
                <div className="h-4 bg-gray-200 rounded w-[80%]"></div>
              </div>
            ))}
            <div className="w-20 px-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ErrorState = ({ message, onRetry }) => (
    <div className="text-center p-6 bg-white rounded-lg shadow">
      <User2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
      <p className="text-gray-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm px-4 py-2 bg-bluePrimary text-white rounded-md hover:bg-bluePrimary/90"
      >
        Try Again
      </button>
    </div>
  );

  ErrorState.propTypes = {
    message: PropTypes.string.isRequired,
    onRetry: PropTypes.func.isRequired
  };

  const handleActionWithLoading = async (action, handler) => {
    setLoadingAction(action);
    setActionError(null);
    try {
      await handler();
    } catch (error) {
      setActionError(
        error.response?.data?.message || 
        "An error occurred while performing this action. Please try again."
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAction = (action, user) => {
    setSelectedUser(user);
    setActionError(null);
    switch (action) {
      case 'delete':
        setShowDeleteDialog(true);
        break;
      case 'activate':
        setShowActivateDialog(true);
        break;
      case 'deactivate':
        setShowDeactivateDialog(true);
        break;
    }
  };

  const handleDelete = async () => {
    await handleActionWithLoading('delete', async () => {
      await adminApi.deleteUser(selectedUser.email);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchDashboardData(); // Refresh data
    });
  };

  const handleActivate = async () => {
    await handleActionWithLoading('activate', async () => {
      await adminApi.activateUser(selectedUser.email);
      setShowActivateDialog(false);
      setSelectedUser(null);
      fetchDashboardData(); // Refresh data
    });
  };

  const handleDeactivate = async () => {
    await handleActionWithLoading('deactivate', async () => {
      await adminApi.suspendUser(selectedUser.email);
      setShowDeactivateDialog(false);
      setSelectedUser(null);
      fetchDashboardData(); // Refresh data
    });
  };

  const getActions = (user) => {
    const actions = [
      {
        id: 'delete',
        label: 'Delete User',
        icon: Trash2
      }
    ];

    if (user.status === 'Active') {
      actions.push({
        id: 'deactivate',
        label: 'Deactivate User',
        icon: UserMinus
      });
    } else {
      actions.push({
        id: 'activate',
        label: 'Activate User',
        icon: UserCheck
      });
    }

    return actions;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleSidebarStateChange = (event) => {
      setSidebarCollapsed(event.detail.isCollapsed);
    };

    window.addEventListener('sidebarStateChange', handleSidebarStateChange);
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarStateChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch admin statistics
      const statsResponse = await adminApi.getAdminStatistics();
      console.log('Stats Response:', statsResponse); // Debug log

      // Fetch users
      const usersResponse = await adminApi.getUsers();
      console.log('Users Response:', usersResponse); // Debug log

      // Transform users data
      const formattedUsers = usersResponse.map(user => ({
        id: user.username,
        name: user.name || '--',
        email: user.username,
        role: user.role?.toLowerCase() || '--',
        status: user.isActive ? 'Active' : 'Inactive',
        last_activity: formatDate(user.last_login),
        total_transaction: typeof user.total_transaction === 'number' 
          ? `₦${user.total_transaction.toLocaleString()}`
          : '₦0'
      }));

      // Set the stats data based on the actual API response fields
      setStatsData({
        activeUsers: statsResponse?.total_active_users || 0,
        totalOrders: statsResponse?.total_completed_transactions || 0,
        totalTransfers: statsResponse?.total_transfers || 0,
        totalVisitors: statsResponse?.total_visitors || 0,
        userGrowth: statsResponse?.percentage_increase || 0,
        orderGrowth: statsResponse?.transaction_growth || 0,
        transferGrowth: statsResponse?.transfer_growth || 0,
        visitorGrowth: statsResponse?.visitor_growth || 0
      });
      
      setUsers(formattedUsers);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}>
          <AdminHeader toggleMobileMenu={() => setIsMobileMenuOpen(true)} />
          <main className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className={cn(
              "grid gap-4",
              "grid-cols-1",
              "md:grid-cols-2",
              sidebarCollapsed 
                ? "xl:grid-cols-4" 
                : "lg:grid-cols-4"
            )}>
              {[...Array(4)].map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
            <LoadingTable />
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}>
          <AdminHeader toggleMobileMenu={() => setIsMobileMenuOpen(true)} />
          <main className="p-6">
            <ErrorState 
              message={error} 
              onRetry={() => {
                setError(null);
                // Implement retry logic
              }} 
            />
          </main>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const stats = [
    { 
      id: 'active-users',
      title: "Active Users", 
      value: statsData.activeUsers,
      change: statsData.userGrowth,
      period: "this week",
      icon: <Users className="w-5 h-5 text-[#4069E5]" />,
      bgColor: "bg-[#EEF1FE]"
    },
    { 
      id: 'total-orders',
      title: "Total Orders", 
      value: statsData.totalOrders,
      change: statsData.orderGrowth,
      period: "this week",
      icon: <ShoppingBag className="w-5 h-5 text-[#3F845F]" />,
      bgColor: "bg-[#EDFAF3]"
    },
    { 
      id: 'total-transfers',
      title: "Total Transfers", 
      value: statsData.totalTransfers,
      change: statsData.transferGrowth,
      period: "this week",
      icon: <ArrowRightLeft className="w-5 h-5 text-[#E4C65B]" />,
      bgColor: "bg-[#FEF9EC]"
    },
    { 
      id: 'total-visitors',
      title: "Total Visitors", 
      value: statsData.totalVisitors,
      change: statsData.visitorGrowth,
      period: "this week",
      icon: <Users2 className="w-5 h-5 text-[#E56940]" />,
      bgColor: "bg-[#FEF1EC]"
    }
  ];

  const EmptyUsersTable = () => (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-gray-100 rounded-full">
          <Users2 className="w-8 h-8 text-gray-400" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        There are currently no users in the system.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      )}>
        <AdminHeader toggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        
        <main className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold font-playfair">Hello, Admin</h1>
            <p className="text-sm text-gray-500">{currentDate}</p>
          </div>

          <div className={cn(
            "grid gap-4",
            "grid-cols-1",
            "md:grid-cols-2",
            sidebarCollapsed 
              ? "xl:grid-cols-4" 
              : "lg:grid-cols-4"
          )}>
            {stats.map((stat) => (
              <Card key={stat.id} className="p-6 bg-white">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                      {stat.icon}
                    </div>
                    <span className="text-sm text-gray-500">{stat.title}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold">{stat.value}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        stat.change === 0 
                          ? 'text-gray-400' 
                          : stat.change > 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                      )}>
                        {stat.change === 0 ? '--' : `${stat.change > 0 ? '+' : ''}${stat.change}%`}
                      </span>
                      <span className="text-sm text-gray-500">{stat.period}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User2 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold">User Management</h2>
              </div>
            </div>
            {users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left pl-10">Name</TableHead>
                    <TableHead className="text-left">Email</TableHead>
                    <TableHead className="text-left">Role</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-left">Last Activity</TableHead>
                    <TableHead className="text-left">Total Transaction</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.slice(0, 5).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-left pl-10">{user.name}</TableCell>
                      <TableCell className="text-left">{user.email}</TableCell>
                      <TableCell className="text-left">{user.role}</TableCell>
                      <TableCell className="text-left">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          user.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">{user.last_activity}</TableCell>
                      <TableCell className="text-left">{user.total_transaction}</TableCell>
                      <TableCell className="text-right pr-6">
                        <ActionMenu
                          actions={getActions(user)}
                          onAction={(action) => handleAction(action, user)}
                          loading={loadingAction !== null}
                          loadingAction={loadingAction}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyUsersTable />
            )}
          </div>
        </main>
      </div>

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        error={actionError}
        loading={loadingAction === 'delete'}
        user={selectedUser}
      />

      <ActivateDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        onConfirm={handleActivate}
        error={actionError}
        loading={loadingAction === 'activate'}
        user={selectedUser}
      />

      <DeactivateDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        onConfirm={handleDeactivate}
        error={actionError}
        loading={loadingAction === 'deactivate'}
        user={selectedUser}
      />
    </div>
  );
}
