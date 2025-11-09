"use client";
import React from "react";
import { Button, Flex, Input, Typography } from "@maxhub/max-ui";
import { Lock, Mail } from "lucide-react";
import Image from "next/image";
import { message } from "antd";
const { Label } = Typography;
export default function Home() {
  const [msg, contextHolder] = message.useMessage();
  /**
   * Функция для валидаии и сбора данных с полей
   * @param {Event} e
   */
  const getValideData = (e) => {
    e.preventDefault();
    const login = e.target.login.value.trim();
    const password = e.target.password.value.trim();
    if (!login && !password) {
      /*
      Используем msg для отображения уведомления 
      Сучествует несколько вариантов - можно просмотреть в параметрах
      */
      msg.error("Заполните все поля");
    } else {
      const data = { login, password };
      console.log(data);
    }
  };
  return (
    <>
      {contextHolder}
      <form
        onSubmit={(e) => {
          getValideData(e);
        }}
      >
        <Flex
          direction="column"
          gap={20}
          justify="center"
          align="center"
          style={{ height: "100vh" }}
        >
          <Image src="/MAI.svg" alt="Логотип МАИ" width={100} height={100} />
          <Label
            variant="custom"
            style={{
              fontSize: "1.5rem",
              fontVariantCaps: "all-small-caps",
              fontWeight: "bold",
            }}
          >
            Войдите
          </Label>
          <Input
            name="login"
            defaultValue=""
            mode="primary"
            placeholder="Логин"
            iconBefore={<Mail></Mail>}
          />
          <Input
            mode="primary"
            name="password"
            defaultValue=""
            placeholder="Пароль"
            iconBefore={<Lock></Lock>}
          />
          <Button type="submit">Войти</Button>
        </Flex>
      </form>
    </>
  );
}
