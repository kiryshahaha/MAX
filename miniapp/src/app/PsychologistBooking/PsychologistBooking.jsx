"use client";
import { useState, useEffect } from "react";
import {
  Button,
  CellHeader,
  CellList,
  CellSimple,
  Container,
  Flex,
  Spinner
} from "@maxhub/max-ui";
import { Select, DatePicker, Modal, message, Tag, Input, App, Row, Col, Card,  } from "antd";
import { Button as AntdButton } from "antd";
import dayjs from "dayjs";
import 'dayjs/locale/ru';

const { Option } = Select;
const { TextArea } = Input;

const PSYCHOLOGISTS = [
  "Клепов Дмитрий Олегович",
  "Кашкина Лариса Владимировна"
];

export default function PsychologistBooking({ user }) {
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userAppointments, setUserAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserAppointments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPsychologist) {
      fetchAvailableDates(selectedPsychologist);
    } else {
      setAvailableDates([]);
    }
  }, [selectedPsychologist]);

  const fetchUserAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const response = await fetch(`/api/psychologists/appointments?user_id=${user.id}`);

      if (!response.ok) {
        throw new Error(`Appointments API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setUserAppointments(data.appointments || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      message.error('Ошибка загрузки ваших записей');
      setUserAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchAvailableDates = async (psychologist) => {
    try {
      const dates = [];
      const today = dayjs();

      for (let i = 0; i < 30; i++) {
        const date = today.add(i, 'day');
        const dateString = date.format('YYYY-MM-DD');

        try {
          const response = await fetch(
            `/api/psychologists/available-slots?psychologist_name=${encodeURIComponent(psychologist)}&date=${dateString}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.available_slots && data.available_slots.length > 0) {
              dates.push(dateString);
            }
          }
        } catch (error) {
        }
      }

      setAvailableDates(dates);
    } catch (error) {
      setAvailableDates([]);
    }
  };

  const getAvailableSlots = async (psychologist, date) => {
    if (!psychologist || !date) return;

    try {
      setLoading(true);
      const dateString = date.format('YYYY-MM-DD');

      const response = await fetch(
        `/api/psychologists/available-slots?psychologist_name=${encodeURIComponent(psychologist)}&date=${dateString}`
      );

      if (!response.ok) {
        throw new Error(`Slots API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const formattedSlots = data.available_slots
          .map(slot => {
            if (typeof slot === 'string' && slot.includes('T')) {
              return dayjs(slot).format('HH:mm');
            }
            return slot; 
          })
          .filter(slot => {
            const hour = parseInt(slot.split(':')[0]);
            return hour >= 11 && hour < 16;
          });

        setAvailableSlots(formattedSlots);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      message.error('Ошибка получения доступного времени');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePsychologistChange = (value) => {
    setSelectedPsychologist(value);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);

    if (date && selectedPsychologist) {
      getAvailableSlots(selectedPsychologist, date);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);
  };

  const createAppointment = async () => {
    if (!selectedPsychologist || !selectedDate || !selectedTime) {
      message.error('Пожалуйста, заполните все поля');
      return;
    }

    try {
      setLoading(true);

      const [hours, minutes] = selectedTime.split(':').map(Number);

      const appointmentDateTime = selectedDate
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      const appointmentTimeString = appointmentDateTime.format('YYYY-MM-DDTHH:mm:ss');


      const appointmentData = {
        user_id: user.id,
        psychologist_name: selectedPsychologist,
        appointment_time: appointmentTimeString, 
        notes: notes || ""
      };


      const response = await fetch('/api/psychologists/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Appointment creation error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        message.success('Запись успешно создана!');
        setIsModalVisible(false);
        resetForm();
        fetchUserAppointments();
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('❌ Ошибка создания записи:', error);
      message.error(error.message || 'Ошибка создания записи');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPsychologist(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes("");
    setAvailableSlots([]);
    setAvailableDates([]);
  };

  const formatAppointmentDate = (dateString, timeString) => {
    try {
      if (timeString.includes('T') || timeString.includes('Z')) {
        const fullDateTime = dayjs(timeString);
        return fullDateTime.format('DD.MM.YYYY в HH:mm');
      }

      const date = dayjs(dateString);
      const fullDateTime = dayjs(`${dateString}T${timeString}`);
      return fullDateTime.format('DD.MM.YYYY в HH:mm');

    } catch (error) {
      return `${dateString} в ${timeString}`; 
    }
  };

  const formatTimeForDisplay = (timeString) => {
    try {
      if (timeString.includes('T') || timeString.includes('Z')) {
        return dayjs(timeString).format('HH:mm');
      }
      return timeString;
    } catch (error) {
      return timeString;
    }
  };

  const isDateAvailable = (current) => {
    if (!current || !selectedPsychologist) return false;

    const dateString = current.format('YYYY-MM-DD');
    return availableDates.includes(dateString);
  };

 const renderTimeSlots = () => {
  if (availableSlots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        Нет доступного времени на выбранную дату
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)', 
      gap: '8px', 
      marginTop: '8px' 
    }}>
      {availableSlots.map((slot) => (
        <div
          key={slot}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            border: selectedTime === slot ? '2px solid #1890ff' : '1px solid #d9d9d9',
            transition: 'all 0.3s',
            borderRadius: '6px',
            padding: '12px 8px',
            fontWeight: '500'
          }}
          onClick={() => setSelectedTime(slot)}
        >
          {slot}
        </div>
      ))}
    </div>
  );
};

  return (
    <>
      <Flex direction="column">
        <CellList
          style={{ width: '100%' }}
          mode="island"
          header={
            <CellHeader>
              Запись к психологу
            </CellHeader>
          }
        >


          {appointmentsLoading ? (
            <CellSimple>
              <Spinner />
            </CellSimple>
          ) : userAppointments.length > 0 ? (
            userAppointments.map((appointment, index) => (

              <CellSimple
                key={index}
                after={
                  <Tag color="blue">
                    {formatTimeForDisplay(appointment.appointment_time)}
                  </Tag>
                }
                title={appointment.psychologist_name}
                subtitle={formatAppointmentDate(
                  appointment.appointment_date,
                  appointment.appointment_time
                )}
              />
            ))

          ) : (
            <CellSimple>
              У вас нет активных записей
              <Button
                type="link"
                onClick={() => setIsModalVisible(true)}
                style={{ marginTop: "10px" }}
              >
                Записаться
              </Button>
            </CellSimple>
          )}


        <Button
          type="link"
          onClick={() => setIsModalVisible(true)}
          mode="secondary"
          stretched="true"
        >
          Новая запись
        </Button>
        </CellList>
        
      </Flex>

<Modal
  title="Запись к психологу"
  open={isModalVisible}
  onCancel={() => {
    setIsModalVisible(false);
    resetForm();
  }}
  footer={
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
<AntdButton
  key="cancel"
  danger
  onClick={() => {
    setIsModalVisible(false);
    resetForm();
  }}
>
  Отмена
</AntdButton>

<AntdButton
  key="submit"
  type="primary"
  loading={loading}
  onClick={createAppointment}
  disabled={!selectedPsychologist || !selectedDate || !selectedTime}
>
  Записаться
</AntdButton>
    </div>
  }
>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {/* ПСИХОЛОГ */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontWeight: 500, fontSize: '14px' }}>Психолог:</span>
      <Select
        placeholder="Выберите психолога"
        value={selectedPsychologist}
        onChange={handlePsychologistChange}
        size="large"
        style={{ width: '100%' }}
      >
        {PSYCHOLOGISTS.map((name) => (
          <Option key={name} value={name}>
            {name}
          </Option>
        ))}
      </Select>
    </div>

    {/* ДАТА */}
    {selectedPsychologist && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>Дата приема:</span>
        <DatePicker
          placeholder="Выберите дату"
          value={selectedDate}
          onChange={handleDateChange}
          disabledDate={(current) => !isDateAvailable(current)}
          format="DD.MM.YYYY"
          size="large"
          style={{ width: '100%' }}
          allowClear={false}
        />
        <span style={{ fontSize: '12px', color: '#666' }}>
          Доступны только даты, когда психолог принимает
        </span>
      </div>
    )}

    {/* ВРЕМЯ */}
    {selectedDate && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>Время приема:</span>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <Spinner />
          </div>
        ) : (
          renderTimeSlots()
        )}
      </div>
    )}

    {/* ПРИМЕЧАНИЕ */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontWeight: 500, fontSize: '14px' }}>Примечание (необязательно):</span>
      <TextArea
        placeholder="Дополнительная информация..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        style={{ resize: "vertical" }}
      />
    </div>
  </div>
</Modal>
    </>
  );
}