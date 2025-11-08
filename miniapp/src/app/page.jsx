"use client";
import React from "react";
import { Button, Flex, Input, Typography } from "@maxhub/max-ui";
import { Lock, Mail } from "lucide-react";
import Image from "next/image";
const { Label } = Typography;
export default function Home() {
  return (
    <form>
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
          defaultValue=""
          mode="primary"
          placeholder="Логин"
          iconBefore={<Mail></Mail>}
        />
        <Input
          defaultValue=""
          mode="secondary"
          placeholder="Пароль"
          iconBefore={<Lock></Lock>}
        />

        <Button type="submit">Войти</Button>
      </Flex>
    </form>
  );
}
