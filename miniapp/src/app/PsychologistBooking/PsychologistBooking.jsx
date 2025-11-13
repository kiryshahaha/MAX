// components/PsychologistBooking.jsx
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
import { Select, DatePicker, Modal, message, Tag, Input, App, Row, Col, Card } from "antd";
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

  // Загружаем записи пользователя
  useEffect(() => {
    if (user) {
      fetchUserAppointments();
    }
  }, [user]);

  // Загружаем доступные даты при выборе психолога
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
      console.error('❌ Ошибка загрузки записей:', error);
      message.error('Ошибка загрузки ваших записей');
      setUserAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Функция для получения доступных дат (проверяем ближайшие 30 дней)
  const fetchAvailableDates = async (psychologist) => {
    try {
      const dates = [];
      const today = dayjs();
      
      // Проверяем доступность на ближайшие 30 дней
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
          console.error(`Ошибка проверки даты ${dateString}:`, error);
        }
      }
      
      setAvailableDates(dates);
    } catch (error) {
      console.error('❌ Ошибка получения доступных дат:', error);
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
      // Преобразуем слоты в читаемый формат и фильтруем по рабочим часам
      const formattedSlots = data.available_slots
        .map(slot => {
          if (typeof slot === 'string' && slot.includes('T')) {
            // Если слот в формате "2025-11-18T16:00:00", извлекаем время
            return dayjs(slot).format('HH:mm');
          }
          return slot; // Если уже в формате "16:00"
        })
        .filter(slot => {
          // Фильтруем слоты, которые входят в рабочие часы психолога
          // Для Клепова Дмитрия Олеговича: с 11:00 до 16:00
          const hour = parseInt(slot.split(':')[0]);
          return hour >= 11 && hour < 16; // с 11:00 до 15:59
        });

      console.log('🕒 Доступные слоты после фильтрации:', formattedSlots);
      setAvailableSlots(formattedSlots);
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Ошибка получения слотов:', error);
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
    
    // Формируем дату-время в московском часовом поясе
    const [hours, minutes] = selectedTime.split(':').map(Number);
    
    const appointmentDateTime = selectedDate
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);

    // Вместо toISOString() используем формат с явным указанием времени
    const appointmentTimeString = appointmentDateTime.format('YYYY-MM-DDTHH:mm:ss');

    console.log('🕒 Московское время:', appointmentTimeString);
    console.log('🕒 UTC время:', appointmentDateTime.toISOString());

    const appointmentData = {
      user_id: user.id,
      psychologist_name: selectedPsychologist,
      appointment_time: appointmentTimeString, // Локальное время без Z
      notes: notes || ""
    };

    console.log('📝 Отправляем данные:', appointmentData);

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
    // Если timeString уже в формате ISO (содержит T или Z), парсим его
    if (timeString.includes('T') || timeString.includes('Z')) {
      const fullDateTime = dayjs(timeString);
      return fullDateTime.format('DD.MM.YYYY в HH:mm');
    }
    
    // Если timeString просто время (например, "14:00"), комбинируем с dateString
    const date = dayjs(dateString);
    const fullDateTime = dayjs(`${dateString}T${timeString}`);
    return fullDateTime.format('DD.MM.YYYY в HH:mm');
    
  } catch (error) {
    console.error('❌ Ошибка форматирования даты:', error);
    return `${dateString} в ${timeString}`; // fallback
  }
};

const formatTimeForDisplay = (timeString) => {
  try {
    if (timeString.includes('T') || timeString.includes('Z')) {
      return dayjs(timeString).format('HH:mm');
    }
    // Если время уже в формате "14:00", возвращаем как есть
    return timeString;
  } catch (error) {
    console.error('❌ Ошибка форматирования времени:', error);
    return timeString;
  }
};

  // Функция для определения доступных дат в календаре
  const isDateAvailable = (current) => {
    if (!current || !selectedPsychologist) return false;
    
    const dateString = current.format('YYYY-MM-DD');
    return availableDates.includes(dateString);
  };

  // Функция для красивого отображения времени
  const renderTimeSlots = () => {
    if (availableSlots.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          Нет доступного времени на выбранную дату
        </div>
      );
    }

    return (
      <Row gutter={[8, 8]} style={{ marginTop: '8px' }}>
        {availableSlots.map((slot) => (
          <Col span={8} key={slot}>
            <Card
              size="small"
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                border: selectedTime === slot ? '2px solid #1890ff' : '1px solid #d9d9d9',
                background: selectedTime === slot ? '#f0f8ff' : '#fff',
                transition: 'all 0.3s'
              }}
              onClick={() => setSelectedTime(slot)}
              hoverable
            >
              <div style={{ fontSize: '16px', fontWeight: '500' }}>
                {slot}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <App>
      <Container>
        <CellList
          filled
          mode="island"
          header={
            <CellHeader titleStyle="caps">
              <Flex direction="row" align="center" justify="space-between">
                <span>Запись к психологу</span>
                <Button
                  type="link"
                  onClick={() => setIsModalVisible(true)}
                  style={{ fontSize: '12px' }}
                >
                  Новая запись
                </Button>
              </Flex>
            </CellHeader>
          }
        >
          {appointmentsLoading ? (
            <CellSimple><Spinner /></CellSimple>
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
                subtitle={formatAppointmentDate(appointment.appointment_date, appointment.appointment_time)}
              ></CellSimple>
            ))
          ) : (
            <CellSimple>
              У вас нет активных записей
              <Button
                type="link"
                onClick={() => setIsModalVisible(true)}
                style={{ marginTop: '10px' }}
              >
                Записаться
              </Button>
            </CellSimple>
          )}
        </CellList>
      </Container>

      <Modal
        title="Запись к психологу"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          resetForm();
        }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsModalVisible(false);
            resetForm();
          }}>
            Отмена
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading}
            onClick={createAppointment}
            disabled={!selectedPsychologist || !selectedDate || !selectedTime}
          >
            Записаться
          </Button>,
        ]}
      >
        <Flex direction="column" gap={4}>
          <div>
            <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
              Психолог:
            </label>
            <Select
              style={{ width: '100%' }}
              placeholder="Выберите психолога"
              value={selectedPsychologist}
              onChange={handlePsychologistChange}
              size="large"
            >
              {PSYCHOLOGISTS.map(name => (
                <Option key={name} value={name}>{name}</Option>
              ))}
            </Select>
          </div>

          {selectedPsychologist && (
            <div>
              <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Дата приема:
              </label>
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Выберите дату"
                value={selectedDate}
                onChange={handleDateChange}
                disabledDate={(current) => !isDateAvailable(current)}
                format="DD.MM.YYYY"
                size="large"
                allowClear={false}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Доступны только даты, когда психолог принимает
              </div>
            </div>
          )}

          {selectedDate && (
            <div>
              <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Время приема:
              </label>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spinner />
                </div>
              ) : (
                renderTimeSlots()
              )}
            </div>
          )}

          <div>
            <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
              Примечание (необязательно):
            </label>
            <TextArea
              placeholder="Дополнительная информация, которую стоит знать психологу..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
        </Flex>
      </Modal>
    </App>
  );
}