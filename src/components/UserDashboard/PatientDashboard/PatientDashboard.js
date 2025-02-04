
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import EditPatientProfile from "../EditProfile/EditPatientProfile";
import AppointmentsList from "../Appointment/AppointmentsList";
import DoctorList from "../DoctorList/DoctorList";
import FeedbackPage from "../FeedbackList/FeedbackPage"
import Prescription from "../YourPrescription/Prescription";
import "./PatientDashboard.css";

const PatientDashboard = () => {
  const [selectedMenu, setSelectedMenu] = useState("Dashboard");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);
  const [completedAppointmentsCount, setCompletedAppointmentsCount] = useState(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState(0);
  const [userProfile, setUserProfile] = useState({
    patientName: "",
    mobileNo: "",
    bloodGroup: "",
    gender: "",
    age: "",
    address: "",
  });

  const socketUrl = "http://localhost:8080/ws";

  // Fetch user's email
  const fetchUserEmail = () => {
    axios
      .get("http://localhost:8080/api/patient/get-welcome-email")
      .then((response) => {
        setUserEmail(response.data.email || "Unknown Email");
      })
      .catch((error) => {
        console.error("Error fetching email:", error);
        setUserEmail("Error fetching email");
      });
  };

  // Fetch user's profile
  const fetchUserProfile = () => {
    axios
      .get("http://localhost:8080/api/patient/profile")
      .then((response) => {
        setUserProfile(response.data);
      })
      .catch((error) => {
        console.error("Error fetching profile:", error);
      });
  };


  const fetchPendingAppointmentsCount = () => {
    axios
      .get("http://localhost:8080/api/patient/pending-appointments-count")
      .then((response) => {
        setPendingAppointmentsCount(response.data.count || 0);
      })
      .catch((error) => {
        console.error("Error fetching pending appointments count:", error);
      });
  };

  // Fetch the count of completed appointments
  const fetchCompletedAppointmentsCount = () => {
    axios
      .get("http://localhost:8080/api/patient/completed-appointments-count")
      .then((response) => {
        setCompletedAppointmentsCount(response.data.count || 0);
        // Since prescriptions count is same as completed appointments count
        setPrescriptionsCount(response.data.count || 0);
      })
      .catch((error) => {
        console.error("Error fetching completed appointments count:", error);
      });
  };

  useEffect(() => {
    fetchPendingAppointmentsCount();
    fetchCompletedAppointmentsCount();
  }, []);

  // Fetch unread notifications
  const fetchNotifications = useCallback(() => {
    if (userEmail) {
      axios
        .get(`http://localhost:8080/notifications/${userEmail}`)
        .then((response) => {
          setNotifications(response.data);
        })
        .catch((error) => {
          console.error("Error fetching notifications:", error);
        });
    }
  }, [userEmail]);

  // Mark notification as read
  const markAsRead = (id) => {
    axios
      .post(`http://localhost:8080/notifications/read/${id}`)
      .then(() => {
        setNotifications(notifications.filter((n) => n.id !== id));
      })
      .catch((error) =>
        console.error("Error marking notification as read:", error)
      );
  };

  // WebSocket for real-time notifications
  useEffect(() => {
    if (userEmail) {
      const socket = new SockJS(socketUrl);
      const stompClient = Stomp.over(socket);

      stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/notifications/${userEmail}`, (message) => {
          const newNotification = JSON.parse(message.body);
          setNotifications((prevNotifications) => [
            newNotification,
            ...prevNotifications,
          ]);
        });
      });

      return () => {
        if (stompClient) {
          stompClient.disconnect();
        }
      };
    }
  }, [userEmail]);

  // Fetch data on component load
  useEffect(() => {
    fetchUserEmail();
    fetchUserProfile();
  }, []);

  // Fetch notifications after email is available
  useEffect(() => {
    if (userEmail) {
      fetchNotifications();
    }
  }, [userEmail, fetchNotifications]);

  const handleMenuClick = (menu) => {
    setSelectedMenu(menu);
  };

  

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="profile-section">
          <img
            src="assets/img/maleuser.png"
            alt="User"
            className="profile-picture"
          />
          <p className="user-name">
            {userProfile.patientName || "Loading Name..."}
          </p>
        </div>
        <ul className="menu-list">
          {["Dashboard", "Edit Profile", "My Appointments", "Doctors List"].map((menu) => (
            <li
              key={menu}
              className={selectedMenu === menu ? "menu-item active" : "menu-item"}
              onClick={() => handleMenuClick(menu)}
            >
              {menu}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="User-navbar">
          <ul>
            <li>
              <a href="/user-dashboard">Home</a>
            </li>
            <li>
              <span>Welcome {userEmail || "Loading..."}</span>
            </li>
            <li>
              <div className="notification-container">
                <button
                  className="notification-bell"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  🔔
                  {notifications.length > 0 && (
                    <span className="notification-badge">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="notification-dropdown">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} className="notification-item">
                          <p>{notification.message}</p>
                          {notification.status !== "READ" && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark As Read
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No new notifications</p>
                    )}
                  </div>
                )}
              </div>
            </li>
            <li>
              <a href="/WelcomePage">Logout</a>
            </li>
          </ul>
        </div>

        {/* Render based on selected menu */}
        <div className="cards-container">
          {selectedMenu === "Dashboard" && (
            <>
              <div className="card">
                <h2>Pending Appointments</h2>
                <p>{pendingAppointmentsCount}</p>
              </div>
              <div className="card">
                <h2>Completed Appointments</h2>
                <p>{completedAppointmentsCount}</p>
              </div>
              <div className="card">
                <h2>Prescriptions</h2>
                <p>{prescriptionsCount}</p>
                  </div>
            </>
          )}

          {selectedMenu === "Edit Profile" && (
            <EditPatientProfile
              refreshData={() => {
                fetchUserEmail();
                fetchUserProfile();
              }}
            />
          )}

          {selectedMenu === "Doctors List" && <DoctorList />}

          {selectedMenu === "My Appointments" && (
            <AppointmentsList setSelectedMenu={setSelectedMenu} />
          )}

          {selectedMenu === "Feedback" && <FeedbackPage />}

          {selectedMenu === "Prescriptions" && <Prescription />}
        </div>
      </div>

      
    </div>
  );
};

export default PatientDashboard;
